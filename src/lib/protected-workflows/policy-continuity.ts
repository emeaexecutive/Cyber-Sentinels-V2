import { hashCanonical } from "../trust-core/hash.ts";

export const workforceContinuityStages = [
  "APPLICATION_IDENTITY",
  "VERIFICATION_IDENTITY",
  "INTERVIEW_IDENTITY",
  "OFFER_IDENTITY",
  "ONBOARDING_IDENTITY",
  "ISSUED_DEVICE",
  "CORPORATE_ACCOUNT",
  "FIRST_ACCESS",
  "PRIVILEGED_ACCESS",
  "CONTINUING_WORKFORCE_IDENTITY",
] as const;

export const workforceContinuityStates = [
  "CONTINUITY_VERIFIED",
  "CONTINUITY_STALE",
  "CONTINUITY_CHANGED",
  "CONTINUITY_UNPROVEN",
  "CONTINUITY_BROKEN",
] as const;

export const workforceContinuityFindings = [
  "APPLICATION_INTERVIEW_IDENTITY_MISMATCH",
  "INTERVIEW_ONBOARDING_IDENTITY_MISMATCH",
  "DEVICE_PROVENANCE_MISMATCH",
  "LOGIN_DEVICE_CHANGED",
  "LOGIN_GEOGRAPHY_CHANGED",
  "REMOTE_ACCESS_PATH_OBSERVED",
  "PRIVILEGED_ACCESS_IDENTITY_UNPROVEN",
  "SIMULTANEOUS_IDENTITY_ACTIVITY",
  "WORKFORCE_CONTINUITY_GAP",
] as const;

export type WorkforceContinuityStage = (typeof workforceContinuityStages)[number];
export type WorkforceContinuityState = (typeof workforceContinuityStates)[number];
export type WorkforceContinuityFinding = (typeof workforceContinuityFindings)[number];

export type PolicyEvidence = {
  evidenceType: "POLICY_EVIDENCE";
  workspace: string;
  workflow: string;
  policyId: string;
  policyVersion: string;
  policyEffectiveAt: string;
  policySource: string;
  policyDigest: string;
  policyScope: string[];
  permittedAiAssistance: string[];
  prohibitedAiAssistance: string[];
  requiredDisclosure: boolean;
  requiredConsent: boolean;
  requiredIdentityControls: string[];
  candidateAcknowledgement: "ACKNOWLEDGED" | "DECLINED" | "NOT_RECORDED";
  acknowledgementTimestamp: string | null;
  acknowledgementMethod: string | null;
  acknowledgementDigest: string;
  sessionId: string | null;
  interviewId: string | null;
  evidenceReferences: string[];
  decisionTransactionReference: string | null;
  recordingPolicy: "ALLOWED" | "APPROVAL_REQUIRED" | "PROHIBITED";
  transcriptRetentionPolicy: "ALLOWED" | "RESTRICTED" | "PROHIBITED";
  externalAiObservationPolicy: "ALLOWED" | "DISCLOSED_ONLY" | "PROHIBITED";
  thirdPartyAggregationPolicy: "ALLOWED" | "PROHIBITED";
  contentRedistributionPolicy: "ALLOWED" | "PROHIBITED";
  candidateAcknowledgementPolicy: "REQUIRED" | "OPTIONAL";
};

export type WorkforceContinuityEvidence = {
  evidenceType: "WORKFORCE_CONTINUITY";
  workspace: string;
  workflow: string;
  operationalEntityId: string;
  stage: WorkforceContinuityStage;
  state: WorkforceContinuityState;
  finding: WorkforceContinuityFinding | null;
  source: string;
  observedAt: string;
  evidenceReferences: string[];
};

type JsonObject = Record<string, unknown>;
const digest = /^[a-f0-9]{64}$/;
const reference = /^[A-Za-z0-9_.:@/+-]{1,240}$/;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function field(input: JsonObject, camel: string, snake: string = camel) {
  return input[camel] ?? input[snake];
}

function requiredReference(value: unknown, name: string) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!reference.test(result)) throw new TypeError(`${name} is invalid.`);
  return result;
}

function optionalReference(value: unknown, name: string) {
  if (value === null || value === undefined || value === "") return null;
  return requiredReference(value, name);
}

function stringList(value: unknown, name: string) {
  if (!Array.isArray(value) || value.length > 50) throw new TypeError(`${name} must be a bounded array.`);
  return [...new Set(value.map((item) => requiredReference(item, name)))].sort();
}

function iso(value: unknown, name: string, nullable = false) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  const result = typeof value === "string" ? value : "";
  if (!Number.isFinite(Date.parse(result))) throw new TypeError(`${name} is invalid.`);
  return new Date(result).toISOString();
}

export function policyAcknowledgementDigest(input: Omit<PolicyEvidence, "acknowledgementDigest" | "decisionTransactionReference" | "evidenceType">) {
  return hashCanonical({
    workspace: input.workspace,
    workflow: input.workflow,
    policyId: input.policyId,
    policyVersion: input.policyVersion,
    policyDigest: input.policyDigest,
    candidateAcknowledgement: input.candidateAcknowledgement,
    acknowledgementTimestamp: input.acknowledgementTimestamp,
    acknowledgementMethod: input.acknowledgementMethod,
    sessionId: input.sessionId,
    interviewId: input.interviewId,
    recordingPolicy: input.recordingPolicy,
    transcriptRetentionPolicy: input.transcriptRetentionPolicy,
    externalAiObservationPolicy: input.externalAiObservationPolicy,
    thirdPartyAggregationPolicy: input.thirdPartyAggregationPolicy,
    contentRedistributionPolicy: input.contentRedistributionPolicy,
    candidateAcknowledgementPolicy: input.candidateAcknowledgementPolicy,
  });
}

export function parsePolicyEvidence(value: unknown, binding: { workspace: string; workflow: string; policyReference: string; observedAt?: string }): PolicyEvidence {
  const input = object(value);
  const workspace = optionalReference(field(input, "workspace", "workspace_id"), "workspace") ?? binding.workspace;
  const workflow = optionalReference(field(input, "workflow", "workflow_id"), "workflow") ?? binding.workflow;
  if (workspace !== binding.workspace) throw new TypeError("Policy evidence belongs to another workspace.");
  if (workflow !== binding.workflow) throw new TypeError("Policy evidence belongs to another workflow.");
  const policyId = requiredReference(field(input, "policyId", "policy_id"), "policyId");
  const policyVersion = requiredReference(field(input, "policyVersion", "policy_version"), "policyVersion");
  if (`${policyId}:${policyVersion}` !== binding.policyReference) throw new TypeError("Policy evidence does not match the workflow policy version.");
  const policyDigest = String(field(input, "policyDigest", "policy_digest") ?? "");
  if (!digest.test(policyDigest)) throw new TypeError("policyDigest must be a SHA-256 digest.");
  const candidateAcknowledgement = String(field(input, "candidateAcknowledgement", "candidate_acknowledgement") ?? "NOT_RECORDED") as PolicyEvidence["candidateAcknowledgement"];
  if (!["ACKNOWLEDGED", "DECLINED", "NOT_RECORDED"].includes(candidateAcknowledgement)) throw new TypeError("candidateAcknowledgement is invalid.");
  const acknowledgementTimestamp = iso(field(input, "acknowledgementTimestamp", "acknowledgement_timestamp"), "acknowledgementTimestamp", true);
  const acknowledgementMethod = optionalReference(field(input, "acknowledgementMethod", "acknowledgement_method"), "acknowledgementMethod");
  if (candidateAcknowledgement === "ACKNOWLEDGED" && (!acknowledgementTimestamp || !acknowledgementMethod)) throw new TypeError("Acknowledgement timestamp and method are required.");
  const bound = {
    workspace,
    workflow,
    policyId,
    policyVersion,
    policyEffectiveAt: iso(field(input, "policyEffectiveAt", "policy_effective_at"), "policyEffectiveAt")!,
    policySource: requiredReference(field(input, "policySource", "policy_source"), "policySource"),
    policyDigest,
    policyScope: stringList(field(input, "policyScope", "policy_scope") ?? [], "policyScope"),
    permittedAiAssistance: stringList(field(input, "permittedAiAssistance", "permitted_ai_assistance") ?? [], "permittedAiAssistance"),
    prohibitedAiAssistance: stringList(field(input, "prohibitedAiAssistance", "prohibited_ai_assistance") ?? [], "prohibitedAiAssistance"),
    requiredDisclosure: field(input, "requiredDisclosure", "required_disclosure") === true,
    requiredConsent: field(input, "requiredConsent", "required_consent") === true,
    requiredIdentityControls: stringList(field(input, "requiredIdentityControls", "required_identity_controls") ?? [], "requiredIdentityControls"),
    candidateAcknowledgement,
    acknowledgementTimestamp,
    acknowledgementMethod,
    sessionId: optionalReference(field(input, "sessionId", "session_id"), "sessionId"),
    interviewId: optionalReference(field(input, "interviewId", "interview_id"), "interviewId"),
    evidenceReferences: stringList(field(input, "evidenceReferences", "evidence_references") ?? [], "evidenceReferences"),
    recordingPolicy: String(field(input, "recordingPolicy", "recording_policy") ?? "ALLOWED") as PolicyEvidence["recordingPolicy"],
    transcriptRetentionPolicy: String(field(input, "transcriptRetentionPolicy", "transcript_retention_policy") ?? "ALLOWED") as PolicyEvidence["transcriptRetentionPolicy"],
    externalAiObservationPolicy: String(field(input, "externalAiObservationPolicy", "external_ai_observation_policy") ?? "ALLOWED") as PolicyEvidence["externalAiObservationPolicy"],
    thirdPartyAggregationPolicy: String(field(input, "thirdPartyAggregationPolicy", "third_party_aggregation_policy") ?? "PROHIBITED") as PolicyEvidence["thirdPartyAggregationPolicy"],
    contentRedistributionPolicy: String(field(input, "contentRedistributionPolicy", "content_redistribution_policy") ?? "PROHIBITED") as PolicyEvidence["contentRedistributionPolicy"],
    candidateAcknowledgementPolicy: String(field(input, "candidateAcknowledgementPolicy", "candidate_acknowledgement_policy") ?? "OPTIONAL") as PolicyEvidence["candidateAcknowledgementPolicy"],
  };
  if (!["ALLOWED", "APPROVAL_REQUIRED", "PROHIBITED"].includes(bound.recordingPolicy)) throw new TypeError("recordingPolicy is invalid.");
  if (!["ALLOWED", "RESTRICTED", "PROHIBITED"].includes(bound.transcriptRetentionPolicy)) throw new TypeError("transcriptRetentionPolicy is invalid.");
  if (!["ALLOWED", "DISCLOSED_ONLY", "PROHIBITED"].includes(bound.externalAiObservationPolicy)) throw new TypeError("externalAiObservationPolicy is invalid.");
  if (!["ALLOWED", "PROHIBITED"].includes(bound.thirdPartyAggregationPolicy)) throw new TypeError("thirdPartyAggregationPolicy is invalid.");
  if (!["ALLOWED", "PROHIBITED"].includes(bound.contentRedistributionPolicy)) throw new TypeError("contentRedistributionPolicy is invalid.");
  if (!["REQUIRED", "OPTIONAL"].includes(bound.candidateAcknowledgementPolicy)) throw new TypeError("candidateAcknowledgementPolicy is invalid.");
  if (bound.acknowledgementTimestamp && Date.parse(bound.acknowledgementTimestamp) < Date.parse(bound.policyEffectiveAt)) throw new TypeError("The acknowledgement predates the policy version.");
  if (binding.observedAt && Date.parse(bound.policyEffectiveAt) > Date.parse(binding.observedAt)) throw new TypeError("The policy version was not effective when observed.");
  const acknowledgementDigest = policyAcknowledgementDigest(bound);
  const suppliedAcknowledgementDigest = field(input, "acknowledgementDigest", "acknowledgement_digest");
  if (suppliedAcknowledgementDigest !== undefined && suppliedAcknowledgementDigest !== acknowledgementDigest) throw new TypeError("acknowledgementDigest does not bind the acknowledgement to this policy version.");
  return {
    evidenceType: "POLICY_EVIDENCE",
    ...bound,
    acknowledgementDigest,
    decisionTransactionReference: optionalReference(field(input, "decisionTransactionReference", "decision_transaction_reference"), "decisionTransactionReference"),
  };
}

export function parseWorkforceContinuityEvidence(value: unknown, binding: { workspace: string; workflow: string; operationalEntityId: string; source: string; observedAt: string }): WorkforceContinuityEvidence {
  const input = object(value);
  const workspace = optionalReference(field(input, "workspace", "workspace_id"), "workspace") ?? binding.workspace;
  const workflow = optionalReference(field(input, "workflow", "workflow_id"), "workflow") ?? binding.workflow;
  const operationalEntityId = optionalReference(field(input, "operationalEntityId", "operational_entity_id"), "operationalEntityId") ?? binding.operationalEntityId;
  if (workspace !== binding.workspace) throw new TypeError("Workforce continuity evidence belongs to another workspace.");
  if (workflow !== binding.workflow) throw new TypeError("Workforce continuity evidence belongs to another workflow.");
  if (operationalEntityId !== binding.operationalEntityId) throw new TypeError("Workforce continuity evidence belongs to another Operational Entity.");
  const stage = String(field(input, "stage")) as WorkforceContinuityStage;
  const state = String(field(input, "state")) as WorkforceContinuityState;
  if (!workforceContinuityStages.includes(stage)) throw new TypeError("Workforce continuity stage is invalid.");
  if (!workforceContinuityStates.includes(state)) throw new TypeError("Workforce continuity state is invalid.");
  const rawFinding = field(input, "finding");
  const finding = rawFinding ? String(rawFinding) as WorkforceContinuityFinding : null;
  if (finding && !workforceContinuityFindings.includes(finding)) throw new TypeError("Workforce continuity finding is invalid.");
  return {
    evidenceType: "WORKFORCE_CONTINUITY",
    workspace,
    workflow,
    operationalEntityId,
    stage,
    state,
    finding,
    source: binding.source,
    observedAt: binding.observedAt,
    evidenceReferences: stringList(field(input, "evidenceReferences", "evidence_references") ?? [], "evidenceReferences"),
  };
}

export function evaluatePolicyAssistance(input: {
  policy: PolicyEvidence | null;
  assistanceObserved: boolean;
  assistanceDeclared: boolean;
  disclosurePresent: boolean;
  corroborated: boolean;
}) {
  if (!input.assistanceObserved) return { authorization: null, reasonCodes: [] as string[] };
  if (!input.policy) return { authorization: "REVIEW" as const, reasonCodes: ["APPLICABLE_POLICY_EVIDENCE_REQUIRED"] };
  const prohibited = input.policy.prohibitedAiAssistance.length > 0;
  const disclosureSatisfied = !input.policy.requiredDisclosure || input.assistanceDeclared || input.disclosurePresent;
  if (!prohibited) return { authorization: null, reasonCodes: ["AI_ASSISTANCE_PERMITTED_BY_POLICY"] };
  if (!input.corroborated) return { authorization: "REVIEW" as const, reasonCodes: ["AI_ASSISTANCE_OBSERVED_NOT_CORROBORATED"] };
  if (!disclosureSatisfied) return { authorization: "REVIEW" as const, reasonCodes: ["AI_ASSISTANCE_POLICY_CONFLICT", "DISCLOSURE_MISSING"] };
  return { authorization: "REVIEW" as const, reasonCodes: ["AI_ASSISTANCE_POLICY_REVIEW_REQUIRED", "DISCLOSURE_PRESENT"] };
}

export type InterviewPolicyObservation = {
  aiAssistanceDeclared?: boolean;
  recordingObserved?: boolean;
  recordingApproved?: boolean;
  transcriptRetainedExternally?: boolean;
  externalAiObserved?: boolean;
  externalAiDisclosed?: boolean;
  thirdPartyAggregationObserved?: boolean;
  contentRedistributed?: boolean;
  candidateAcknowledged?: boolean;
};

export function evaluateInterviewObservationPolicy(policy: PolicyEvidence, observation: InterviewPolicyObservation) {
  const reasonCodes: string[] = [];
  const deny = (condition: boolean, code: string) => { if (condition) reasonCodes.push(code); };
  const review = (condition: boolean, code: string) => { if (condition && !reasonCodes.includes(code)) reasonCodes.push(code); };
  deny(policy.recordingPolicy === "PROHIBITED" && observation.recordingObserved === true, "RECORDING_PROHIBITED");
  review(policy.recordingPolicy === "APPROVAL_REQUIRED" && observation.recordingObserved === true && observation.recordingApproved !== true, "RECORDING_APPROVAL_REQUIRED");
  deny(policy.transcriptRetentionPolicy === "PROHIBITED" && observation.transcriptRetainedExternally === true, "TRANSCRIPT_RETENTION_PROHIBITED");
  review(policy.transcriptRetentionPolicy === "RESTRICTED" && observation.transcriptRetainedExternally === true, "TRANSCRIPT_RETENTION_REVIEW_REQUIRED");
  deny(policy.externalAiObservationPolicy === "PROHIBITED" && observation.externalAiObserved === true, "EXTERNAL_AI_OBSERVATION_PROHIBITED");
  review(policy.externalAiObservationPolicy === "DISCLOSED_ONLY" && observation.externalAiObserved === true && observation.externalAiDisclosed !== true, "EXTERNAL_AI_DISCLOSURE_REQUIRED");
  deny(policy.thirdPartyAggregationPolicy === "PROHIBITED" && observation.thirdPartyAggregationObserved === true, "THIRD_PARTY_AGGREGATION_PROHIBITED");
  deny(policy.contentRedistributionPolicy === "PROHIBITED" && observation.contentRedistributed === true, "CONTENT_REDISTRIBUTION_PROHIBITED");
  review(policy.candidateAcknowledgementPolicy === "REQUIRED" && observation.candidateAcknowledged !== true, "CANDIDATE_ACKNOWLEDGEMENT_REQUIRED");
  if (!reasonCodes.length) return { authorization: "ALLOW" as const, reasonCodes: ["INTERVIEW_POLICY_COMPLIANT"] };
  const denyCodes = new Set(["RECORDING_PROHIBITED", "TRANSCRIPT_RETENTION_PROHIBITED", "EXTERNAL_AI_OBSERVATION_PROHIBITED", "THIRD_PARTY_AGGREGATION_PROHIBITED", "CONTENT_REDISTRIBUTION_PROHIBITED"]);
  return { authorization: reasonCodes.some((code) => denyCodes.has(code)) ? "DENY" as const : "REVIEW" as const, reasonCodes };
}

const continuityRank: Record<WorkforceContinuityState, number> = {
  CONTINUITY_VERIFIED: 0,
  CONTINUITY_STALE: 1,
  CONTINUITY_CHANGED: 2,
  CONTINUITY_UNPROVEN: 3,
  CONTINUITY_BROKEN: 4,
};

export function evaluateWorkforceContinuity(records: readonly WorkforceContinuityEvidence[]) {
  const ordered = [...records].sort((a, b) => workforceContinuityStages.indexOf(a.stage) - workforceContinuityStages.indexOf(b.stage));
  const currentState = ordered.reduce<WorkforceContinuityState>((worst, item) => continuityRank[item.state] > continuityRank[worst] ? item.state : worst, "CONTINUITY_VERIFIED");
  const findings = [...new Set(ordered.flatMap((item) => item.finding ? [item.finding] : []))];
  const degraded = currentState !== "CONTINUITY_VERIFIED";
  return {
    currentState,
    timeline: ordered,
    findings,
    authorization: degraded ? "REVIEW" as const : null,
    intervention: ["CONTINUITY_CHANGED", "CONTINUITY_UNPROVEN", "CONTINUITY_BROKEN"].includes(currentState) ? "STEP_UP_VERIFICATION" as const : degraded ? "CHALLENGE" as const : "MONITOR" as const,
    reasonCodes: degraded ? [...findings, currentState, "STEP_UP_VERIFICATION_REQUIRED"] : ["WORKFORCE_CONTINUITY_VERIFIED"],
  };
}
