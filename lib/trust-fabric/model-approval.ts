import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import { createApprovedModelStateBaseline, createCurrentObservedModelState, evaluateModelStateIntegrity, type ApprovedModelStateSnapshotInput, type CurrentObservedModelStateInput, type ModelStateIntegrityAssessment } from "./model-state-integrity.ts";

export const MODEL_APPROVAL_SOURCE = "CYBER_SENTINELS_MODEL_APPROVAL_REGISTRY";
export const MODEL_APPROVAL_EVIDENCE = "MODEL_APPROVAL_STATE";
export type ModelApprovalStatus = "UNKNOWN" | "APPROVED" | "UNAPPROVED" | "REVOKED" | "EXPIRED" | "CONFLICTED";
export type ModelApprovalFacts = {
  version: "1.0";
  enterpriseId: string;
  agentId: string;
  environment: string;
  status: "APPROVED" | "UNAPPROVED" | "REVOKED";
  approvalAuthority: string;
  approvalReference: string;
  approvedAt: string;
  validUntil: string;
  manifestDigest: string;
  baseline: ApprovedModelStateSnapshotInput;
  observation: CurrentObservedModelStateInput;
};
export type ModelApprovalSnapshot = {
  status: ModelApprovalStatus;
  source: typeof MODEL_APPROVAL_SOURCE;
  evidenceReference: string | null;
  evidenceDigest: string | null;
  approvalAuthority: string | null;
  approvalReference: string | null;
  modelId: string | null;
  modelProvider: string | null;
  modelVersion: string | null;
  approvedAt: string | null;
  validUntil: string | null;
  evaluatedAt: string;
  reason: string;
  provenance: "CONTROLLED_REGISTRY_NOT_PROVIDER_ATTESTATION";
};
export type TrustedModelState = { approval: ModelApprovalSnapshot; integrity: ModelStateIntegrityAssessment | null };
export type ModelApprovalRow = {
  enterprise_id: string; subject_id: string; evidence_id: string; evidence_type: string;
  provider_key: string; source_type: string; source_key: string; server_verified: boolean;
  payload_hash: string; normalized_facts: unknown; observed_at: string; expires_at: string | null;
};
export type ModelApprovalBinding = { enterpriseId: string; agentId: string; environment: string; evaluatedAt: string; manifest: { digest: string; modelId: string | null; modelProvider: string | null; modelVersion: string | null } | null };

/** Only service-controlled ledger rows enter here. A digest detects alteration; it is not a signature. */
export function resolveModelApproval(row: ModelApprovalRow | null, binding: ModelApprovalBinding): TrustedModelState {
  const approval: ModelApprovalSnapshot = {
    status: "UNKNOWN", source: MODEL_APPROVAL_SOURCE, evidenceReference: row?.evidence_id ?? null,
    evidenceDigest: row?.payload_hash ?? null, approvalAuthority: null, approvalReference: null,
    modelId: null, modelProvider: null, modelVersion: null, approvedAt: null, validUntil: null,
    evaluatedAt: binding.evaluatedAt, reason: "MODEL_APPROVAL_UNKNOWN", provenance: "CONTROLLED_REGISTRY_NOT_PROVIDER_ATTESTATION",
  };
  const reject = (reason: string): TrustedModelState => ({ approval: { ...approval, status: "CONFLICTED", reason }, integrity: null });
  if (!row) return { approval, integrity: null };
  if (row.enterprise_id !== binding.enterpriseId || row.subject_id !== binding.agentId) return reject("MODEL_APPROVAL_SCOPE_MISMATCH");
  if (!row.server_verified || row.provider_key !== "cyber_sentinels_native" || row.source_type !== MODEL_APPROVAL_SOURCE || row.source_key !== MODEL_APPROVAL_SOURCE || row.evidence_type !== MODEL_APPROVAL_EVIDENCE) return reject("MODEL_APPROVAL_SOURCE_UNTRUSTED");
  try {
    const facts = row.normalized_facts as ModelApprovalFacts;
    if (!facts || facts.version !== "1.0" || hashCanonical(facts) !== row.payload_hash) return reject("MODEL_APPROVAL_EVIDENCE_TAMPERED");
    if (facts.enterpriseId !== binding.enterpriseId || facts.agentId !== binding.agentId || facts.environment !== binding.environment
      || facts.baseline.enterpriseId !== binding.enterpriseId || facts.observation.enterpriseId !== binding.enterpriseId
      || facts.baseline.agentId !== binding.agentId || facts.observation.agentId !== binding.agentId
      || facts.baseline.runtimeEnvironment !== binding.environment || facts.observation.runtimeEnvironment !== binding.environment) return reject("MODEL_APPROVAL_SCOPE_MISMATCH");
    if (!facts.approvalAuthority?.startsWith("operator:") || !facts.approvalReference || !["APPROVED", "UNAPPROVED", "REVOKED"].includes(facts.status)) return reject("MODEL_APPROVAL_AUTHORITY_INVALID");
    if (facts.baseline.evidenceProvider !== MODEL_APPROVAL_SOURCE || facts.observation.evidenceProvider !== MODEL_APPROVAL_SOURCE || facts.observation.providerAssertions?.length) return reject("MODEL_APPROVAL_PROVENANCE_INVALID");
    const now = Date.parse(binding.evaluatedAt), approved = Date.parse(facts.approvedAt), until = Date.parse(facts.validUntil), observed = Date.parse(row.observed_at);
    if (![now, approved, until, observed].every(Number.isFinite) || approved > now || observed > now || until <= approved || Date.parse(row.expires_at ?? "") !== until) return reject("MODEL_APPROVAL_VALIDITY_INVALID");
    Object.assign(approval, { approvalAuthority: facts.approvalAuthority, approvalReference: facts.approvalReference, modelId: facts.baseline.modelId, modelProvider: facts.baseline.modelProvider, modelVersion: facts.baseline.modelVersion, approvedAt: facts.approvedAt, validUntil: facts.validUntil });
    if (facts.status !== "APPROVED") return { approval: { ...approval, status: facts.status, reason: `MODEL_APPROVAL_${facts.status}` }, integrity: null };
    if (until <= now) return { approval: { ...approval, status: "EXPIRED", reason: "MODEL_APPROVAL_EXPIRED" }, integrity: null };
    const manifest = binding.manifest;
    if (!manifest || facts.manifestDigest !== manifest.digest || facts.baseline.modelId !== manifest.modelId || facts.baseline.modelProvider !== manifest.modelProvider || facts.baseline.modelVersion !== manifest.modelVersion) return reject("MODEL_APPROVAL_MANIFEST_MISMATCH");
    const baseline = createApprovedModelStateBaseline(facts.baseline);
    const observation = createCurrentObservedModelState(facts.observation);
    const integrity = evaluateModelStateIntegrity({ enterpriseId: binding.enterpriseId, approved: baseline, observed: observation, evaluatedAt: binding.evaluatedAt, validation: { validationReference: facts.approvalReference, validatedBaselineDigest: baseline.baselineDigest } });
    if (!["EXACT_MATCH", "SUPPORTED_MATCH"].includes(integrity.modelIntegrityState) || integrity.modelStateEvidenceFreshness !== "CURRENT") return { approval: { ...approval, status: "CONFLICTED", reason: "MODEL_APPROVAL_OBSERVATION_UNRESOLVED" }, integrity };
    return { approval: { ...approval, status: "APPROVED", reason: "MODEL_APPROVAL_APPROVED" }, integrity };
  } catch {
    return reject("MODEL_APPROVAL_EVIDENCE_INVALID");
  }
}
