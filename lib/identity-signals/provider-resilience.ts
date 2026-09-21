import { createHash } from "node:crypto";
import type {
  AdapterCollectionResult,
  AdapterContext,
  IdentityProviderCapability,
  IdentityProviderHealth,
  IdentityReasonCode,
  IdentitySignalAdapter,
  IdentitySignalType,
  SignalEvidenceDraft,
} from "./types";

export const identityProviderPolicyModes = [
  "PRIMARY_PROVIDER",
  "ALTERNATIVE_PROVIDER",
  "REQUIRED_PROVIDER",
  "MULTI_PROVIDER_REQUIRED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_CONFLICT",
] as const;
export type IdentityProviderPolicyMode = (typeof identityProviderPolicyModes)[number];

export type NormalizedIdentityEvidence = {
  provider: string;
  provider_reference: string;
  verification_type: string;
  identity_subject: string;
  credential_type: string;
  document_verified: boolean | null;
  liveness_verified: boolean | null;
  biometric_match: boolean | null;
  database_match: boolean | null;
  assurance_level: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  provider_outcome: "VERIFIED" | "FAILED" | "PENDING" | "UNAVAILABLE" | "EXPIRED";
  provider_reason_codes: string[];
  verified_at: string | null;
  expires_at: string | null;
  evidence_digest: string;
  environment: "sandbox" | "production" | "unknown";
  evidence_provenance: "PROVIDER_API" | "SIGNED_CALLBACK" | "REGISTRY";
};

export type ProviderVerificationResult = Omit<NormalizedIdentityEvidence, "provider" | "evidence_digest"> & {
  provider: string;
  account_reference?: string | null;
};

export type ProviderVerificationClient = {
  retrieve(reference: string, context: AdapterContext): Promise<ProviderVerificationResult>;
};

export type IdentityProviderSelection = {
  mode: IdentityProviderPolicyMode;
  providerIds: string[];
};

const identitySignal: IdentitySignalType = "IDENTITY_ASSERTION";
const reason = (value: string): IdentityReasonCode => value as IdentityReasonCode;

function digest(value: ProviderVerificationResult) {
  return createHash("sha256").update(JSON.stringify({
    provider: value.provider,
    provider_reference: value.provider_reference,
    verification_type: value.verification_type,
    identity_subject: value.identity_subject,
    credential_type: value.credential_type,
    document_verified: value.document_verified,
    liveness_verified: value.liveness_verified,
    biometric_match: value.biometric_match,
    database_match: value.database_match,
    assurance_level: value.assurance_level,
    provider_outcome: value.provider_outcome,
    provider_reason_codes: value.provider_reason_codes,
    verified_at: value.verified_at,
    expires_at: value.expires_at,
    environment: value.environment,
  })).digest("hex");
}

function normalizedEvidence(value: ProviderVerificationResult): SignalEvidenceDraft {
  const now = new Date().toISOString();
  const expired = value.expires_at ? Date.parse(value.expires_at) <= Date.now() : false;
  const outcome = expired ? "INCONCLUSIVE" : value.provider_outcome === "VERIFIED" ? "VERIFIED" : value.provider_outcome === "FAILED" ? "FAILED" : "INCONCLUSIVE";
  const status = expired ? "INCONCLUSIVE" : value.provider_outcome === "VERIFIED" ? "PASS" : value.provider_outcome === "FAILED" ? "FAIL" : value.provider_outcome === "UNAVAILABLE" ? "UNAVAILABLE" : "PENDING";
  const evidenceDigest = digest(value);
  return {
    signalType: identitySignal,
    providerId: value.provider,
    status,
    outcome,
    confidence: value.assurance_level === "HIGH" ? 0.9 : value.assurance_level === "MEDIUM" ? 0.7 : value.assurance_level === "LOW" ? 0.4 : 0,
    riskScore: null,
    riskFlags: [],
    serverVerified: true,
    signatureVerified: false,
    providerEventId: value.provider_reference,
    providerReference: value.provider_reference,
    providerTransactionId: value.provider_reference,
    providerRequestId: value.provider_reference,
    payloadHash: evidenceDigest,
    normalizedValue: {
      provider: value.provider,
      providerReference: value.provider_reference,
      verificationType: value.verification_type,
      identitySubject: value.identity_subject,
      credentialType: value.credential_type,
      documentVerified: value.document_verified,
      livenessVerified: value.liveness_verified,
      biometricMatch: value.biometric_match,
      databaseMatch: value.database_match,
      assuranceLevel: value.assurance_level,
      providerOutcome: value.provider_outcome,
      environment: value.environment,
      evidenceProvenance: value.evidence_provenance,
    },
    provenance: { source: value.evidence_provenance === "SIGNED_CALLBACK" ? "signed_callback" : "provider_api", mappingVersion: "identity-evidence-v1", collectedAt: now },
    sourceDigest: evidenceDigest,
    reasonCodes: [...value.provider_reason_codes.map(reason), ...(expired ? [reason("PROVIDER_VERIFICATION_PENDING")] : [])],
    limitations: ["Provider evidence is identity assurance only; it does not authorize an action."],
    attributes: { providerOutcome: value.provider_outcome, expiresAt: value.expires_at, verifiedAt: value.verified_at, environment: value.environment },
    observedAt: value.verified_at ?? now,
    expiresAt: value.expires_at,
  };
}

export class ProviderIdentityEvidenceAdapter implements IdentitySignalAdapter {
  readonly signals = [identitySignal] as const;
  constructor(readonly providerId: string, private readonly client?: ProviderVerificationClient, private readonly implementationStatus: IdentityProviderCapability["implementationStatus"] = "IMPLEMENTED") {}
  getCapabilities(): Promise<IdentityProviderCapability[]> {
    return Promise.resolve([{ providerId: this.providerId, signalType: identitySignal, providerName: this.providerId, implementationStatus: this.implementationStatus, runtimeStatus: this.client ? "AVAILABLE" : "BLOCKED_BY_CREDENTIALS", serverVerified: Boolean(this.client), limitations: ["Provider results are normalized as evidence and never decide authorization."] }]);
  }
  async healthCheck(): Promise<IdentityProviderHealth> {
    return { providerId: this.providerId, available: Boolean(this.client), state: this.client ? "HEALTHY" : "MISCONFIGURED", reasonCode: this.client ? null : "PROVIDER_NOT_CONFIGURED", checkedAt: new Date().toISOString() };
  }
  async collectSignal(signalType: IdentitySignalType, context: AdapterContext): Promise<AdapterCollectionResult> {
    if (signalType !== identitySignal) return { transactionStatus: "BLOCKED", errorCode: "SIGNAL_UNSUPPORTED", limitations: ["This adapter supports identity assertion only."], evidence: { ...normalizedEvidence({ provider: this.providerId, provider_reference: "unavailable", verification_type: "identity", identity_subject: context.subjectId, credential_type: "unknown", document_verified: null, liveness_verified: null, biometric_match: null, database_match: null, assurance_level: "NONE", provider_outcome: "UNAVAILABLE", provider_reason_codes: ["SIGNAL_UNSUPPORTED"], verified_at: null, expires_at: null, environment: "unknown", evidence_provenance: "PROVIDER_API" }), signalType } };
    const reference = typeof context.input.providerReference === "string" ? context.input.providerReference : "";
    if (!this.client || !reference) {
      const evidence = normalizedEvidence({ provider: this.providerId, provider_reference: reference || "unavailable", verification_type: "identity", identity_subject: context.subjectId, credential_type: "unknown", document_verified: null, liveness_verified: null, biometric_match: null, database_match: null, assurance_level: "NONE", provider_outcome: "UNAVAILABLE", provider_reason_codes: ["PROVIDER_UNAVAILABLE"], verified_at: null, expires_at: null, environment: context.input.environment === "production" ? "production" : "sandbox", evidence_provenance: "PROVIDER_API" });
      return { transactionStatus: "UNAVAILABLE", errorCode: "PROVIDER_UNAVAILABLE", limitations: evidence.limitations, evidence };
    }
    const result = await this.client.retrieve(reference, context);
    if (result.account_reference && result.account_reference !== context.enterpriseId) throw new Error("IDENTITY_PROVIDER_ACCOUNT_MISMATCH");
    const evidence = normalizedEvidence(result);
    return { transactionStatus: evidence.outcome === "VERIFIED" ? "SUCCEEDED" : evidence.outcome === "FAILED" ? "FAILED" : "INCONCLUSIVE", providerTransactionId: result.provider_reference, providerRequestId: result.provider_reference, limitations: evidence.limitations, evidence };
  }
  async verifyCallback(input: { rawBody: string; signature: string; receivedAt: Date; correlationId: string }) {
    return [normalizedEvidence({ provider: this.providerId, provider_reference: `callback:${input.correlationId}`, verification_type: "identity", identity_subject: "unknown", credential_type: "unknown", document_verified: null, liveness_verified: null, biometric_match: null, database_match: null, assurance_level: "NONE", provider_outcome: "PENDING", provider_reason_codes: ["PROVIDER_VERIFICATION_PENDING"], verified_at: input.receivedAt.toISOString(), expires_at: null, environment: "unknown", evidence_provenance: "SIGNED_CALLBACK" })];
  }
}

export type StripeIdentitySessionStarter = (context: AdapterContext) => Promise<{ providerSessionId: string; clientSecret: string | null; url: string | null }>;

export class StripeIdentityAdapter extends ProviderIdentityEvidenceAdapter {
  constructor(client?: ProviderVerificationClient, private readonly starter?: StripeIdentitySessionStarter) { super("stripe_identity", client); }

  // Starts a new VerificationSession only when the caller has not already supplied an existing session reference to retrieve.
  async collectSignal(signalType: IdentitySignalType, context: AdapterContext): Promise<AdapterCollectionResult> {
    const hasExistingReference = typeof context.input.providerReference === "string" && context.input.providerReference.length > 0;
    if (hasExistingReference || !this.starter || signalType !== identitySignal) return super.collectSignal(signalType, context);
    const now = new Date().toISOString();
    try {
      const started = await this.starter(context);
      const draft: SignalEvidenceDraft = {
        signalType, providerId: this.providerId, status: "PENDING", outcome: "INCONCLUSIVE", confidence: 0,
        riskScore: null, riskFlags: [], serverVerified: false, signatureVerified: false,
        providerEventId: null, providerReference: started.providerSessionId, providerTransactionId: started.providerSessionId, providerRequestId: null,
        payloadHash: null, normalizedValue: null,
        provenance: { source: "provider_api", mappingVersion: "identity-signal-v1", collectedAt: now },
        sourceDigest: null, reasonCodes: [reason("PROVIDER_VERIFICATION_PENDING")],
        limitations: ["Session creation is not identity proof; a signed webhook and authoritative retrieval remain required."],
        observedAt: now,
      };
      return {
        transactionStatus: "INCONCLUSIVE",
        providerSessionId: started.providerSessionId,
        providerTransactionId: started.providerSessionId,
        limitations: draft.limitations,
        evidence: draft,
        clientPayload: { clientSecret: started.clientSecret ?? "", url: started.url ?? "" },
      };
    } catch (error) {
      return {
        transactionStatus: "UNAVAILABLE",
        errorCode: "STRIPE_SESSION_START_FAILED",
        limitations: ["Stripe Identity session could not be started."],
        evidence: {
          signalType, providerId: this.providerId, status: "UNAVAILABLE", outcome: "UNAVAILABLE", confidence: 0,
          riskScore: null, riskFlags: [], serverVerified: false, signatureVerified: false,
          providerEventId: null, providerReference: null, providerTransactionId: null, providerRequestId: null,
          payloadHash: null, normalizedValue: null,
          provenance: { source: "none", mappingVersion: "identity-signal-v1", collectedAt: now },
          sourceDigest: null, reasonCodes: [reason("STRIPE_SESSION_START_FAILED")],
          limitations: [error instanceof Error ? error.message : "Stripe Identity session could not be started."],
          observedAt: now,
        },
      };
    }
  }
}
export class PersonaIdentityAdapter extends ProviderIdentityEvidenceAdapter {
  constructor(client?: ProviderVerificationClient) { super("persona", client, "PARTIALLY_IMPLEMENTED"); }
}
export class VeriffIdentityAdapter extends ProviderIdentityEvidenceAdapter {
  constructor(client?: ProviderVerificationClient) { super("veriff", client, "DOCUMENTED_ONLY"); }
}

export function evaluateProviderPolicy(input: { selection: IdentityProviderSelection; evidence: NormalizedIdentityEvidence[] }) {
  const available = new Set(input.evidence.filter((item) => item.provider_outcome === "VERIFIED").map((item) => item.provider));
  const expected = new Set(input.selection.providerIds);
  const conflict = new Set(input.evidence.filter((item) => item.provider_outcome !== "PENDING").map((item) => `${item.provider}:${item.provider_outcome}`)).size > 1;
  if (conflict) return { decision: "REVIEW" as const, reasonCodes: ["PROVIDER_CONFLICT"] };
  if (input.selection.mode === "MULTI_PROVIDER_REQUIRED" && [...expected].some((provider) => !available.has(provider))) return { decision: "REVIEW" as const, reasonCodes: ["MULTI_PROVIDER_REQUIRED", "PROVIDER_UNAVAILABLE"] };
  if (input.selection.mode === "REQUIRED_PROVIDER" && !available.has(input.selection.providerIds[0])) return { decision: "REVIEW" as const, reasonCodes: ["REQUIRED_PROVIDER", "PROVIDER_UNAVAILABLE"] };
  return { decision: null, reasonCodes: [] as string[] };
}
