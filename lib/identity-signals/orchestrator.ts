import { calculateIdentityConfidence, isUuid, parseRequestedSignals, requestDigest } from "./core.ts";
import type { IdentityRepository } from "./repository.ts";
import type { AdapterCollectionResult, IdentityReasonCode, IdentitySignalAdapter, IdentitySignalType, SignalEvidenceDraft } from "./types.ts";

export type IdentityOrchestrationInput = {
  repository: IdentityRepository;
  adapters: IdentitySignalAdapter[];
  enterpriseId: string;
  subjectId: string;
  requestedSignals: IdentitySignalType[];
  purpose: string;
  idempotencyKey: string;
  actorId: string;
  signalInputs: Record<string, unknown>;
  correlationId?: string;
};

function orchestrationError(message: string, status: number, code: string) {
  const error = new Error(message) as Error & { status?: number; code?: string };
  error.status = status;
  error.code = code;
  return error;
}

function failedCollection(signalType: IdentitySignalType, providerId: string, status: "ERROR" | "UNAVAILABLE" | "UNSUPPORTED", reasonCode: IdentityReasonCode, limitation: string): AdapterCollectionResult {
  const now = new Date().toISOString();
  const outcome = status === "ERROR" ? "FAILED" : status;
  const evidence: SignalEvidenceDraft = {
    signalType,
    providerId,
    status,
    outcome,
    confidence: 0,
    riskScore: null,
    riskFlags: [],
    serverVerified: false,
    signatureVerified: false,
    providerEventId: null,
    providerReference: null,
    providerTransactionId: null,
    providerRequestId: null,
    payloadHash: null,
    normalizedValue: null,
    provenance: { source: "none", mappingVersion: "identity-signal-v1", collectedAt: now },
    sourceDigest: null,
    reasonCodes: [reasonCode],
    limitations: [limitation],
    observedAt: now,
  };
  return { transactionStatus: status === "UNAVAILABLE" ? "UNAVAILABLE" : "FAILED", errorCode: reasonCode, limitations: [limitation], evidence };
}

async function withinTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => { timeout = setTimeout(() => reject(orchestrationError("Provider execution exceeded its runtime budget.", 504, "PROVIDER_TIMEOUT")), timeoutMs); }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class IdentitySignalOrchestrator {
  private readonly options: { repository: IdentityRepository; adapters: IdentitySignalAdapter[]; providerTimeoutMs?: number };

  constructor(options: { repository: IdentityRepository; adapters: IdentitySignalAdapter[]; providerTimeoutMs?: number }) {
    this.options = options;
  }

  async execute(input: Omit<IdentityOrchestrationInput, "repository" | "adapters">) {
    if (!isUuid(input.enterpriseId) || !isUuid(input.subjectId) || !isUuid(input.actorId)) throw orchestrationError("Trusted identity context is invalid.", 400, "INVALID_IDENTITY_CONTEXT");
    const requestedSignals = parseRequestedSignals(input.requestedSignals);
    if (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) throw orchestrationError("Idempotency-Key must contain 8 to 160 characters.", 400, "INVALID_IDEMPOTENCY_KEY");
    if (!input.purpose.trim() || input.purpose.length > 120) throw orchestrationError("purpose is required and must be at most 120 characters.", 400, "INVALID_PURPOSE");

    const hash = requestDigest({ subjectId: input.subjectId, requestedSignals, purpose: input.purpose, signalInputs: input.signalInputs });
    const existing = await this.options.repository.findRequest(input.enterpriseId, input.idempotencyKey, "identity_verification");
    if (existing) {
      if (existing.request_hash !== hash) throw orchestrationError("Idempotency-Key was already used for a different request.", 409, "IDEMPOTENCY_CONFLICT");
      return { schemaVersion: 1 as const, correlationId: existing.correlation_id, requestId: existing.id, status: existing.status, replayed: true, reasonCode: "IDEMPOTENT_REPLAY_RETURNED" as const, details: await this.options.repository.requestDetails(input.enterpriseId, existing.id) };
    }

    await this.options.repository.assertSubject(input.enterpriseId, input.subjectId);
    let request;
    try {
      request = await this.options.repository.createRequest({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestedSignals, purpose: input.purpose, operation: "identity_verification", idempotencyKey: input.idempotencyKey, requestHash: hash, actorId: input.actorId, correlationId: input.correlationId });
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || (error as Error & { code?: string }).code !== "23505") throw error;
      const concurrent = await this.options.repository.findRequest(input.enterpriseId, input.idempotencyKey, "identity_verification");
      if (!concurrent || concurrent.request_hash !== hash) throw orchestrationError("Idempotency-Key was concurrently used for a different request.", 409, "IDEMPOTENCY_CONFLICT");
      return { schemaVersion: 1 as const, correlationId: concurrent.correlation_id, requestId: concurrent.id, status: concurrent.status, replayed: true, reasonCode: "IDEMPOTENT_REPLAY_RETURNED" as const, details: await this.options.repository.requestDetails(input.enterpriseId, concurrent.id) };
    }

    const collectedEvidence: SignalEvidenceDraft[] = [];
    const timeoutMs = Math.max(100, Math.min(this.options.providerTimeoutMs ?? 10_000, 30_000));
    for (const signalType of requestedSignals) {
      const adapter = this.options.adapters.find((candidate) => candidate.signals.includes(signalType));
      let collected: AdapterCollectionResult;
      const started = Date.now();
      if (!adapter) {
        collected = failedCollection(signalType, "unregistered", "UNSUPPORTED", "SIGNAL_UNSUPPORTED", `No provider contract exists for ${signalType}.`);
      } else {
        try {
          const capabilities = await withinTimeout(adapter.getCapabilities(), timeoutMs);
          const capability = capabilities.find((candidate) => candidate.signalType === signalType);
          if (!capability || capability.implementationStatus === "MISSING" || capability.runtimeStatus === "UNSUPPORTED") {
            collected = failedCollection(signalType, adapter.providerId, "UNSUPPORTED", "SIGNAL_UNSUPPORTED", `${adapter.providerId} does not implement ${signalType}.`);
          } else if (capability.runtimeStatus === "AVAILABLE") {
            const health = await withinTimeout(adapter.healthCheck(), timeoutMs);
            collected = health.available
              ? await withinTimeout(adapter.collectSignal(signalType, { enterpriseId: input.enterpriseId, subjectId: input.subjectId, verificationRequestId: request.id, correlationId: request.correlation_id, purpose: input.purpose, input: input.signalInputs }), timeoutMs)
              : failedCollection(signalType, adapter.providerId, "UNAVAILABLE", health.reasonCode ?? "PROVIDER_UNAVAILABLE", `${adapter.providerId} is not healthy enough to execute.`);
          } else {
            // Safe local adapters explain blocked, disabled and externally gated
            // states without invoking an unavailable external provider.
            collected = await withinTimeout(adapter.collectSignal(signalType, { enterpriseId: input.enterpriseId, subjectId: input.subjectId, verificationRequestId: request.id, correlationId: request.correlation_id, purpose: input.purpose, input: input.signalInputs }), timeoutMs);
          }
        } catch (error) {
          const timedOut = error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "PROVIDER_TIMEOUT";
          collected = failedCollection(signalType, adapter.providerId, timedOut ? "UNAVAILABLE" : "ERROR", timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR", timedOut ? "Provider timed out and was isolated from the remaining signals." : "Provider failed and contributed zero positive confidence.");
        }
      }
      collectedEvidence.push(collected.evidence);
      await this.options.repository.saveCollection({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestId: request.id, result: collected, latencyMs: Date.now() - started });
    }

    const confidence = calculateIdentityConfidence(collectedEvidence);
    const requestStatus = collectedEvidence.every((item) => item.status === "PASS" && item.serverVerified && item.signatureVerified) ? "COMPLETED" : "PARTIAL";
    await this.options.repository.finalize({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestId: request.id, correlationId: request.correlation_id, actorId: input.actorId, requestStatus, confidence });
    return { schemaVersion: 1 as const, correlationId: request.correlation_id, requestId: request.id, status: requestStatus, replayed: false, reasonCode: null, details: await this.options.repository.requestDetails(input.enterpriseId, request.id) };
  }
}

export async function orchestrateIdentityVerification(input: IdentityOrchestrationInput) {
  return new IdentitySignalOrchestrator({ repository: input.repository, adapters: input.adapters }).execute(input);
}
