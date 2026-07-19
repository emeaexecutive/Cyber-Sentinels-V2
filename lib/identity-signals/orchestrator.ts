import { calculateIdentityConfidence, requestDigest } from "./core.ts";
import type { IdentityRepository } from "./repository.ts";
import type { IdentitySignalAdapter, IdentitySignalType, SignalEvidenceDraft } from "./types.ts";

export async function orchestrateIdentityVerification(input: {
  repository: IdentityRepository;
  adapters: IdentitySignalAdapter[];
  enterpriseId: string;
  subjectId: string;
  requestedSignals: IdentitySignalType[];
  purpose: string;
  idempotencyKey: string;
  actorId: string;
  signalInputs: Record<string, unknown>;
}) {
  const hash = requestDigest({ subjectId: input.subjectId, requestedSignals: input.requestedSignals, purpose: input.purpose, signalInputs: input.signalInputs });
  const existing = await input.repository.findRequest(input.enterpriseId, input.idempotencyKey);
  if (existing) {
    if (existing.request_hash !== hash) {
      const error = new Error("Idempotency-Key was already used for a different request.") as Error & { status?: number; code?: string };
      error.status = 409; error.code = "IDEMPOTENCY_CONFLICT"; throw error;
    }
    return { replayed: true, reasonCode: "IDEMPOTENT_REPLAY_RETURNED", details: await input.repository.requestDetails(input.enterpriseId, existing.id) };
  }
  await input.repository.assertSubject(input.enterpriseId, input.subjectId);
  let request;
  try {
    request = await input.repository.createRequest({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestedSignals: input.requestedSignals, purpose: input.purpose, idempotencyKey: input.idempotencyKey, requestHash: hash, actorId: input.actorId });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || (error as Error & { code?: string }).code !== "23505") throw error;
    const concurrent = await input.repository.findRequest(input.enterpriseId, input.idempotencyKey);
    if (!concurrent || concurrent.request_hash !== hash) {
      const conflict = new Error("Idempotency-Key was concurrently used for a different request.") as Error & { status?: number; code?: string };
      conflict.status = 409; conflict.code = "IDEMPOTENCY_CONFLICT"; throw conflict;
    }
    return { replayed: true, reasonCode: "IDEMPOTENT_REPLAY_RETURNED", details: await input.repository.requestDetails(input.enterpriseId, concurrent.id) };
  }
  const evidence: SignalEvidenceDraft[] = [];
  for (const signalType of input.requestedSignals) {
    const adapter = input.adapters.find((candidate) => candidate.signals.includes(signalType));
    if (!adapter) throw new Error(`No adapter truth record exists for ${signalType}.`);
    const started = Date.now();
    const collected = await adapter.collect(signalType, { enterpriseId: input.enterpriseId, subjectId: input.subjectId, verificationRequestId: request.id, correlationId: request.correlation_id, purpose: input.purpose, input: input.signalInputs });
    evidence.push(collected.evidence);
    await input.repository.saveCollection({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestId: request.id, result: collected, latencyMs: Date.now() - started });
  }
  const confidence = calculateIdentityConfidence(evidence);
  const requestStatus = evidence.every((item) => item.outcome === "VERIFIED") ? "COMPLETED" : "PARTIAL";
  await input.repository.finalize({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, requestId: request.id, correlationId: request.correlation_id, actorId: input.actorId, requestStatus, confidence });
  return { replayed: false, reasonCode: null, details: await input.repository.requestDetails(input.enterpriseId, request.id) };
}
