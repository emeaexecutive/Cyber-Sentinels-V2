export const protectedWorkflowTypes = [
  "candidate_interview", "candidate_assessment", "employee_onboarding",
  "privileged_access", "agent_action", "financial_approval", "other",
] as const;
export type ProtectedWorkflowType = (typeof protectedWorkflowTypes)[number];

export const protectedWorkflowStatuses = [
  "created", "active", "challenge_required", "paused", "blocked",
  "completed", "terminated",
] as const;
export type ProtectedWorkflowStatus = (typeof protectedWorkflowStatuses)[number];

export const workflowInterventions = [
  "MONITOR", "WARNING", "CHALLENGE", "STEP_UP_VERIFY", "PAUSE", "BLOCK",
  "TERMINATE", "RESUME",
] as const;
export type WorkflowIntervention = (typeof workflowInterventions)[number];

export const workflowEvidenceCategories = [
  "identity", "session", "device", "network", "browser", "media",
  "behaviour", "ai_assistance", "remote_access", "deepfake",
  "proxy_candidate", "consent", "policy", "manual_review",
] as const;
export type WorkflowEvidenceCategory = (typeof workflowEvidenceCategories)[number];

export const aiAssistanceEvidenceTypes = [
  "ai_assistance_observed",
  "ai_assistance_declared",
  "ai_assistance_policy_conflict",
  "possible_realtime_answer_assistance",
] as const;
export type AiAssistanceEvidenceType = (typeof aiAssistanceEvidenceTypes)[number];

export const aiAssistanceProviderMetadata = [
  "Parakeet", "ChatGPT", "Claude", "Gemini", "unknown", "other",
] as const;

export const aiAssistancePolicies = ["allowed", "allowed_if_declared", "restricted", "prohibited"] as const;
export type AiAssistancePolicy = (typeof aiAssistancePolicies)[number];
export type CanonicalDecision = "ALLOW" | "REVIEW" | "DENY";
export type ProviderCapabilityState = "AVAILABLE" | "UNKNOWN" | "NOT_CONFIGURED";

export type ProviderAdapterObservation = {
  providerKey: string;
  sourceParty: string;
  capabilityState: ProviderCapabilityState;
  observedAt?: string;
  category?: WorkflowEvidenceCategory;
  metadata?: Record<string, unknown>;
};

export interface ProtectedWorkflowSignalProvider {
  readonly providerKey: string;
  readonly sourceParty: string;
  readonly capabilityState: ProviderCapabilityState;
  readonly capabilities: readonly WorkflowEvidenceCategory[];
  ingest(observation: ProviderAdapterObservation): Promise<readonly WorkflowEvidenceInput[]>;
}

export type WorkflowEvidenceInput = {
  category: WorkflowEvidenceCategory;
  evidenceType?: AiAssistanceEvidenceType;
  source: string;
  sourceParty: string;
  observedAt: string;
  confidence?: number;
  classification: string;
  severity: "informational" | "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
};

const terminalStatuses = new Set<ProtectedWorkflowStatus>(["completed", "terminated"]);
const transitions: Record<ProtectedWorkflowStatus, ReadonlySet<ProtectedWorkflowStatus>> = {
  created: new Set(["active", "terminated"]),
  active: new Set(["challenge_required", "paused", "blocked", "completed", "terminated"]),
  challenge_required: new Set(["active", "paused", "blocked", "terminated"]),
  paused: new Set(["active", "blocked", "terminated"]),
  blocked: new Set(["active", "terminated"]),
  completed: new Set(),
  terminated: new Set(),
};

const forbiddenCallerKeys = new Set([
  "allow", "deny", "decision", "trustDecision", "trust_result", "trustResult",
  "trustScore", "trust_score", "authorityResult", "authority_result",
  "verificationResult", "verification_result", "fraud", "malicious",
]);

function boundedReference(value: unknown, field: string, maximum = 180) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maximum || !/^[A-Za-z0-9_.:@/+-]+$/.test(result)) throw new TypeError(`${field} is invalid.`);
  return result;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rejectAuthoritativeClaims(value: unknown, path = "body") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) return value.forEach((item, index) => rejectAuthoritativeClaims(item, `${path}[${index}]`));
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenCallerKeys.has(key)) throw new TypeError(`${path}.${key} is server-authoritative and cannot be submitted.`);
    rejectAuthoritativeClaims(item, `${path}.${key}`);
  }
}

export function parseWorkflowEvidence(value: unknown): WorkflowEvidenceInput {
  rejectAuthoritativeClaims(value);
  const input = object(value);
  const category = String(input.category ?? "") as WorkflowEvidenceCategory;
  if (!workflowEvidenceCategories.includes(category)) throw new TypeError("Evidence category is invalid.");
  const rawEvidenceType = input.evidenceType ?? input.evidence_type;
  const evidenceType = rawEvidenceType === undefined ? undefined : String(rawEvidenceType) as AiAssistanceEvidenceType;
  if (category === "ai_assistance" && (!evidenceType || !aiAssistanceEvidenceTypes.includes(evidenceType))) throw new TypeError("AI-assistance evidence type is invalid.");
  if (category !== "ai_assistance" && evidenceType !== undefined) throw new TypeError("evidenceType is only valid for AI-assistance evidence.");
  const observedAt = String(input.observedAt ?? input.observed_at ?? "");
  if (!Number.isFinite(Date.parse(observedAt)) || Date.parse(observedAt) > Date.now() + 60_000) throw new TypeError("observedAt is invalid.");
  const severity = String(input.severity ?? "") as WorkflowEvidenceInput["severity"];
  if (!["informational", "low", "medium", "high", "critical"].includes(severity)) throw new TypeError("Evidence severity is invalid.");
  const confidence = input.confidence === undefined ? undefined : Number(input.confidence);
  if (confidence !== undefined && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) throw new TypeError("Evidence confidence must be between 0 and 1.");
  const metadata = object(input.metadata);
  const serialized = JSON.stringify(metadata);
  if (serialized.length > 16_000) throw new TypeError("Evidence metadata is too large.");
  return {
    category,
    ...(evidenceType === undefined ? {} : { evidenceType }),
    source: boundedReference(input.source, "source"),
    sourceParty: boundedReference(input.sourceParty ?? input.source_party, "sourceParty"),
    observedAt: new Date(observedAt).toISOString(),
    ...(confidence === undefined ? {} : { confidence }),
    classification: boundedReference(input.classification, "classification"),
    severity,
    metadata,
  };
}

export function assertProviderObservation(observation: ProviderAdapterObservation) {
  if (observation.capabilityState !== "AVAILABLE") {
    if (observation.observedAt || observation.category || observation.metadata) throw new TypeError("Unavailable providers cannot emit observed evidence.");
    return observation;
  }
  if (!observation.observedAt || !observation.category) throw new TypeError("Available provider evidence requires an observation timestamp and category.");
  return observation;
}

export function canTransitionWorkflow(current: ProtectedWorkflowStatus, next: ProtectedWorkflowStatus) {
  return transitions[current].has(next);
}

export function assertWorkflowMutable(status: ProtectedWorkflowStatus) {
  if (terminalStatuses.has(status)) throw new TypeError("Completed or terminated workflows cannot be changed.");
}

export function evaluateAiAssistance(input: {
  policy: AiAssistancePolicy;
  declared: boolean;
  observed: boolean;
  confidence?: number;
  corroborated: boolean;
  highConsequence: boolean;
}) {
  if (!input.observed) return { authorization: null, reasonCodes: [] as string[] };
  if (input.policy === "allowed") return { authorization: null, reasonCodes: ["AI_ASSISTANCE_ALLOWED"] };
  if (input.policy === "allowed_if_declared" && input.declared) return { authorization: null, reasonCodes: ["AI_ASSISTANCE_DECLARED"] };
  if (input.policy === "prohibited" && input.corroborated && input.highConsequence && (input.confidence ?? 0) >= 0.8) {
    return { authorization: "DENY" as const, reasonCodes: ["CORROBORATED_PROHIBITED_AI_HIGH_CONSEQUENCE"] };
  }
  return {
    authorization: "REVIEW" as const,
    reasonCodes: [input.policy === "allowed_if_declared" ? "AI_DECLARATION_REQUIRED" : "AI_ASSISTANCE_POLICY_REVIEW_REQUIRED"],
  };
}

export function interventionForDecision(input: {
  decision: CanonicalDecision;
  humanReviewRequired?: boolean;
  preferred?: WorkflowIntervention;
  policyPermitsBlock?: boolean;
  policyPermitsTerminate?: boolean;
}): WorkflowIntervention {
  const preferred = input.preferred;
  if (input.decision === "ALLOW") return preferred === "RESUME" ? "RESUME" : "MONITOR";
  if (input.decision === "REVIEW") {
    if (preferred && ["WARNING", "CHALLENGE", "STEP_UP_VERIFY", "PAUSE"].includes(preferred)) return preferred;
    return input.humanReviewRequired ? "PAUSE" : "CHALLENGE";
  }
  if (input.humanReviewRequired) return "PAUSE";
  if (preferred === "TERMINATE" && input.policyPermitsTerminate) return "TERMINATE";
  if (input.policyPermitsBlock) return "BLOCK";
  return "PAUSE";
}

export function statusForIntervention(intervention: WorkflowIntervention): ProtectedWorkflowStatus {
  if (["CHALLENGE", "STEP_UP_VERIFY"].includes(intervention)) return "challenge_required";
  if (intervention === "PAUSE") return "paused";
  if (intervention === "BLOCK") return "blocked";
  if (intervention === "TERMINATE") return "terminated";
  return "active";
}

export function workflowEvidenceResult(evidence: WorkflowEvidenceInput) {
  if (evidence.category === "identity" && /confirmed|verified|continuous/i.test(evidence.classification)) return "POSITIVE" as const;
  if (evidence.category === "consent" && /confirmed|acknowledged/i.test(evidence.classification)) return "POSITIVE" as const;
  if (evidence.category === "policy") return "POSITIVE" as const;
  if (evidence.category === "ai_assistance") return "INCONCLUSIVE" as const;
  if (["high", "critical"].includes(evidence.severity) && evidence.confidence !== undefined && evidence.confidence >= 0.8 && evidence.metadata?.corroborated === true) return "NEGATIVE" as const;
  return evidence.severity === "informational" ? "POSITIVE" as const : "INCONCLUSIVE" as const;
}

export function rejectCallerAuthoritativeClaims(value: unknown) { rejectAuthoritativeClaims(value); }
