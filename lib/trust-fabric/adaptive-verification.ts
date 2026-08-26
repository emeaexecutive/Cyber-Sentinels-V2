import { deterministicUuid, hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { ForecastSubjectType, TrustConditionInput, TrustForecast, TrustForecastGraphProjection } from "./trust-forecast.ts";

export const VERIFICATION_DEPTHS = ["OBSERVE", "VERIFY", "STEP_UP", "GATE"] as const;
export const VERIFICATION_STATUSES = ["OBSERVING", "SATISFIED", "STEP_UP_REQUIRED", "GATED_PENDING_PROOF", "INSUFFICIENT_EVIDENCE", "UNKNOWN"] as const;
export const ADAPTIVE_CONSEQUENCE_CLASSES = ["MINIMAL", "LOW", "MATERIAL", "HIGH", "CRITICAL", "UNKNOWN"] as const;
export const VERIFICATION_CHALLENGES = [
  "VERIFY_IDENTITY",
  "VERIFY_DEVICE",
  "VERIFY_RUNTIME",
  "VERIFY_AGENT_CONFIGURATION",
  "VERIFY_MODEL_STATE",
  "VERIFY_AUTHORITY",
  "VERIFY_HUMAN_INTENT",
  "VERIFY_DESTINATION",
  "VERIFY_MONITORING",
  "VERIFY_MACHINE_STATE",
  "VERIFY_POLICY_ACKNOWLEDGEMENT",
] as const;

export type VerificationDepth = (typeof VERIFICATION_DEPTHS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type AdaptiveConsequenceClass = (typeof ADAPTIVE_CONSEQUENCE_CLASSES)[number];
export type VerificationChallenge = (typeof VERIFICATION_CHALLENGES)[number];

export type VerificationEvidenceInput = {
  challenge?: VerificationChallenge | null;
  evidenceType: string;
  providerClass: string;
  providerKey: string;
  observedAt: string;
  expiresAt?: string | null;
  outcome: string;
  evidenceReferences: string[];
  assurance?: number | null;
  retestReference?: string | null;
};

export type VerificationEvidenceRequirement = {
  challenge: VerificationChallenge;
  required: boolean;
  reason: string;
  acceptableProviderClasses: string[];
  maximumAgeMinutes: number;
  minimumConfidence: number;
  resolves: string[];
};

export type CurrentVerificationEvidence = {
  challenge: VerificationChallenge;
  status: "PASS" | "STALE" | "INVALIDATED_BY_CHANGE" | "FAIL" | "INCONCLUSIVE" | "MISSING";
  providerClass: string | null;
  providerKey: string | null;
  observedAt: string | null;
  expiresAt: string | null;
  freshness: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "INVALIDATED" | "UNAVAILABLE";
  confidence: number;
  evidenceReferences: string[];
  reason: string;
};

export type MinimumSufficientProof = {
  primaryChallenge: VerificationChallenge | null;
  challenges: VerificationChallenge[];
  reason: string;
  providerCollectionBoundary: "CYBER_SENTINELS_DEFINES_WHAT_PROVIDERS_MAY_DEFINE_HOW";
};

export type TrustGap = {
  exists: boolean;
  status: "NONE" | "OPEN" | "RESOLVED" | "UNKNOWN";
  gapId: string;
  consequence: AdaptiveConsequenceClass;
  affectedAuthority: string;
  missingEvidence: VerificationChallenge[];
  minimumProofRequired: MinimumSufficientProof;
  recommendedRemediation: string[];
};

export type AdaptiveVerificationPolicy = {
  policyReference: string;
  policyVersion: string;
  pressureThresholds: { verify: number; stepUp: number; gate: number };
  freshnessMinutes: Record<VerificationDepth, number>;
  minimumConfidence: Record<VerificationDepth, number>;
  criticalActions: string[];
  requiredHumanApprovalConsequences: AdaptiveConsequenceClass[];
};

export type AdaptiveVerificationRequirement = {
  verificationVersion: "1.0";
  verificationId: string;
  label: "ADAPTIVE_TRUST_VERIFICATION";
  enterpriseId: string;
  entityId: string;
  entityType: ForecastSubjectType;
  requiredVerificationDepth: VerificationDepth;
  verificationStatus: VerificationStatus;
  reason: string[];
  consequence: AdaptiveConsequenceClass;
  requiredEvidence: VerificationEvidenceRequirement[];
  currentEvidence: CurrentVerificationEvidence[];
  missingEvidence: VerificationChallenge[];
  evidenceFreshness: "CURRENT" | "AGING" | "STALE" | "EXPIRED" | "INVALIDATED" | "UNAVAILABLE";
  minimumSufficientProof: MinimumSufficientProof;
  minimumStepUp: VerificationChallenge | null;
  confidence: number;
  policyReference: string;
  policyVersion: string;
  lastVerifiedAt: string | null;
  stepUpReason: string[];
  verificationProviderClasses: string[];
  trustGap: TrustGap;
  graphProjection: TrustForecastGraphProjection;
  replayEvents: Array<{ eventType: string; occurredAt: string; evidenceReferences: string[]; details: Record<string, unknown> }>;
  trustMemoryEvents: Array<{ eventId: string; eventType: string; occurredAt: string; evidenceReferences: string[] }>;
  canonicalAuthorityBoundary: {
    verifiedDoesNotMeanAuthorized: true;
    verificationCanGrantAuthority: false;
    verificationCanAllow: false;
    verificationCanDeny: false;
    lowTrustMeansMalicious: false;
    decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY";
  };
  source: "DERIVED_FROM_TRUST_TWIN_AND_CANONICAL_EVIDENCE";
  knownLimitations: string[];
  evaluatedAt: string;
  verificationDigest: string;
};

export type AdaptiveVerificationInput = {
  enterpriseId: string;
  entity: { id: string; type: ForecastSubjectType };
  action: { type: string; purpose: string; environment: string };
  authorityReference: string;
  authorityScopeValid: boolean;
  evaluatedAt: string;
  policy?: Partial<AdaptiveVerificationPolicy> | null;
  forecast: TrustForecast;
  trustPressure: { value: number; level: string; trend: string; primaryContributors: Array<{ code: string; evidenceReferences: string[] }> };
  trustBudget: { total: number; consumed: number; remaining: number; status: string; context: Record<string, string | number>; contextualConstraints: Array<{ code: string; evidenceReferences: string[] }> };
  consequenceReach: { systemCount: number; dimensionCount: number; level: string; productionResources: string[]; financialExposure: string[]; humanImpactingSystems: string[]; dataClasses: string[]; destinations: string[] };
  evidence?: VerificationEvidenceInput[];
  materialChanges?: string[];
  previousVerification?: AdaptiveVerificationRequirement | null;
};

const depthRank: Record<VerificationDepth, number> = { OBSERVE: 0, VERIFY: 1, STEP_UP: 2, GATE: 3 };
const consequenceRank: Record<AdaptiveConsequenceClass, number> = { MINIMAL: 0, LOW: 1, MATERIAL: 2, HIGH: 3, CRITICAL: 4, UNKNOWN: 2 };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:@/+\-]{1,300}$/;
const forbiddenSecretKey = /(?:^|_)(?:secret|password|private_key|access_token|refresh_token|credential_value|api_key)(?:$|_)/i;
const secretLikeValue = /(?:bearer\s+[A-Za-z0-9._~+/=-]{16,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;

const providerClasses: Record<VerificationChallenge, string[]> = {
  VERIFY_IDENTITY: ["IDENTITY_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_DEVICE: ["EDR_PROVIDER", "IDENTITY_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_RUNTIME: ["RUNTIME_SECURITY_PROVIDER", "EDGE_ATTESTATION_PROVIDER", "AI_ASSURANCE_PROVIDER"],
  VERIFY_AGENT_CONFIGURATION: ["AI_ASSURANCE_PROVIDER", "MODEL_EVALUATION_PROVIDER", "CI_CD_PROVIDER"],
  VERIFY_MODEL_STATE: ["RUNTIME_SECURITY_PROVIDER", "AI_ASSURANCE_PROVIDER", "MODEL_EVALUATION_PROVIDER", "EDGE_ATTESTATION_PROVIDER", "CI_CD_PROVIDER"],
  VERIFY_AUTHORITY: ["IAM_PROVIDER", "IDENTITY_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_HUMAN_INTENT: ["HUMAN_APPROVAL_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_DESTINATION: ["DSPM_PROVIDER", "NETWORK_SECURITY_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_MONITORING: ["RUNTIME_SECURITY_PROVIDER", "EDR_PROVIDER", "APPLICATION_SIGNAL"],
  VERIFY_MACHINE_STATE: ["ROBOTICS_RUNTIME_PROVIDER", "ROBOTICS_SAFETY_PROVIDER", "SENSOR_EVIDENCE_PROVIDER", "EDGE_ATTESTATION_PROVIDER"],
  VERIFY_POLICY_ACKNOWLEDGEMENT: ["POLICY_PROVIDER", "APPLICATION_SIGNAL"],
};

const conditionByChallenge: Record<VerificationChallenge, TrustConditionInput["dimension"][]> = {
  VERIFY_IDENTITY: ["IDENTITY_STABILITY"],
  VERIFY_DEVICE: ["IDENTITY_STABILITY", "RUNTIME_ASSURANCE"],
  VERIFY_RUNTIME: ["RUNTIME_ASSURANCE"],
  VERIFY_AGENT_CONFIGURATION: ["MODEL_CHANGE_RISK", "TOOL_EXPOSURE", "TOOL_PARAMETER_PROVENANCE"],
  VERIFY_MODEL_STATE: ["MODEL_STATE_INTEGRITY", "MODEL_CHANGE_RISK", "RUNTIME_ASSURANCE"],
  VERIFY_AUTHORITY: ["AUTHORITY_STABILITY", "AUTHORITY_EXPOSURE", "AUTHORIZATION_PROPAGATION"],
  VERIFY_HUMAN_INTENT: ["INTENT_ALIGNMENT", "HUMAN_OVERSIGHT"],
  VERIFY_DESTINATION: ["DESTINATION_EXPOSURE"],
  VERIFY_MONITORING: ["MONITORING_COVERAGE"],
  VERIFY_MACHINE_STATE: ["RUNTIME_ASSURANCE", "IDENTITY_STABILITY"],
  VERIFY_POLICY_ACKNOWLEDGEMENT: ["POLICY_CHANGE_RISK"],
};

function assertSafe(value: unknown, path = "input") {
  if (typeof value === "string" && secretLikeValue.test(value)) throw new TypeError(`${path} appears to contain a raw secret.`);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenSecretKey.test(key)) throw new TypeError(`${path}.${key} is not permitted; use a reference or digest.`);
    assertSafe(child, `${path}.${key}`);
  }
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function unique(values: readonly string[]) { return [...new Set(values.filter(Boolean))].sort(); }
function clamp(value: number, minimum = 0, maximum = 1) { return Math.max(minimum, Math.min(maximum, Math.round(value * 1000) / 1000)); }
function laterDepth(left: VerificationDepth, right: VerificationDepth): VerificationDepth { return depthRank[left] >= depthRank[right] ? left : right; }
function condition(input: AdaptiveVerificationInput, dimensions: TrustConditionInput["dimension"][]) { return input.forecast.conditions.find((item) => dimensions.includes(item.dimension)); }

function policyFor(input: AdaptiveVerificationInput): AdaptiveVerificationPolicy {
  const reference = input.policy?.policyReference ?? input.forecast.trustTwinContext?.source ?? input.forecast.subject.id;
  const policyReference = referencePattern.test(reference) ? reference : input.forecast.subject.id;
  const policyVersion = input.policy?.policyVersion ?? input.forecast.forecastVersion;
  return {
    policyReference,
    policyVersion,
    pressureThresholds: input.policy?.pressureThresholds ?? { verify: 35, stepUp: 65, gate: 85 },
    freshnessMinutes: input.policy?.freshnessMinutes ?? { OBSERVE: 10_080, VERIFY: 1_440, STEP_UP: 60, GATE: 15 },
    minimumConfidence: input.policy?.minimumConfidence ?? { OBSERVE: 0.25, VERIFY: 0.6, STEP_UP: 0.75, GATE: 0.85 },
    criticalActions: unique(input.policy?.criticalActions ?? ["write_repository", "move_funds", "enter_human_workspace", "production_write", "delete_repository"]),
    requiredHumanApprovalConsequences: input.policy?.requiredHumanApprovalConsequences ?? ["CRITICAL"],
  };
}

export function classifyAdaptiveConsequence(input: AdaptiveVerificationInput): AdaptiveConsequenceClass {
  const context = input.trustBudget.context;
  const text = `${input.action.type} ${input.action.purpose} ${input.action.environment} ${String(context.consequenceSeverity ?? "")} ${String(context.dataSensitivity ?? "")} ${String(context.financialExposure ?? "")} ${String(context.humanSafetyImpact ?? "")} ${input.consequenceReach.productionResources.join(" ")} ${input.consequenceReach.financialExposure.join(" ")} ${input.consequenceReach.dataClasses.join(" ")}`.toUpperCase();
  const boundedRead = /READ|LIST|INSPECT|QUERY/.test(`${input.action.type} ${input.action.purpose}`.toUpperCase())
    && !/PRODUCTION|RESTRICTED|SECRET|PAYMENT|FINANCIAL|CRITICAL|HUMAN/.test(text)
    && input.consequenceReach.systemCount <= 10;
  if (boundedRead) return "LOW";
  if (/HUMAN_SAFETY_CRITICAL|LIFE_SAFETY|CRITICAL_FINANCIAL|EUR_10M|10M|MILLION/.test(text)) return "CRITICAL";
  if (/CRITICAL|SEVERE/.test(String(context.consequenceSeverity ?? "").toUpperCase())) return "CRITICAL";
  if (input.consequenceReach.humanImpactingSystems.length || input.consequenceReach.financialExposure.length || /PRODUCTION|RESTRICTED|HIGH/.test(text) || input.consequenceReach.level === "EXTENSIVE") return "HIGH";
  if (/MATERIAL|MODERATE|WRITE|ELEVATED/.test(text) || input.consequenceReach.level === "BROAD") return "MATERIAL";
  if (/MINIMAL|NON_CONSEQUENTIAL/.test(text)) return "MINIMAL";
  if (/LOW|STANDARD|INTERNAL/.test(text)) return "LOW";
  return "UNKNOWN";
}

function pressureDepth(input: AdaptiveVerificationInput, consequence: AdaptiveConsequenceClass, policy: AdaptiveVerificationPolicy): VerificationDepth {
  const consequenceAdjustment = consequence === "CRITICAL" ? -25 : consequence === "HIGH" ? -15 : consequence === "LOW" || consequence === "MINIMAL" ? 15 : 0;
  const entityAdjustment = input.entity.type === "ROBOT" && input.consequenceReach.humanImpactingSystems.length ? -10 : 0;
  const adjust = consequenceAdjustment + entityAdjustment;
  const value = input.trustPressure.value;
  if (value >= Math.max(40, policy.pressureThresholds.gate + adjust)) return "GATE";
  if (value >= Math.max(25, policy.pressureThresholds.stepUp + adjust)) return "STEP_UP";
  if (value >= Math.max(10, policy.pressureThresholds.verify + adjust)) return "VERIFY";
  return "OBSERVE";
}

function requiredDepth(input: AdaptiveVerificationInput, consequence: AdaptiveConsequenceClass, policy: AdaptiveVerificationPolicy) {
  let depth: VerificationDepth = consequence === "CRITICAL" ? "GATE" : consequence === "HIGH" ? "STEP_UP" : consequence === "MATERIAL" || consequence === "UNKNOWN" ? "VERIFY" : "OBSERVE";
  depth = laterDepth(depth, input.forecast.state === "SEVERE" ? "GATE" : input.forecast.state === "ELEVATED" || input.forecast.state === "INSUFFICIENT_EVIDENCE" ? "STEP_UP" : input.forecast.state === "WATCH" ? "VERIFY" : "OBSERVE");
  depth = laterDepth(depth, pressureDepth(input, consequence, policy));
  depth = laterDepth(depth, input.trustBudget.status === "EXCEEDED" ? "GATE" : input.trustBudget.status === "NEAR_LIMIT" || input.trustBudget.status === "UNKNOWN" ? "STEP_UP" : input.trustBudget.status === "CONSTRAINED" ? "VERIFY" : "OBSERVE");
  const changes = unique([...(input.materialChanges ?? []), ...input.forecast.materialChanges, ...input.forecast.forecastSignals]);
  if (changes.some((item) => /IDENTITY|OWNER|MODEL|RUNTIME|DEVICE|CREDENTIAL|AUTHORITY|TOOL|DESTINATION|APPROVER|FIRMWARE|ENVIRONMENT/.test(item))) depth = laterDepth(depth, consequenceRank[consequence] >= consequenceRank.HIGH ? "GATE" : "STEP_UP");
  if (policy.criticalActions.some((action) => input.action.type.toLowerCase().includes(action.toLowerCase())) && /prod/i.test(`${input.action.environment} ${input.consequenceReach.productionResources.join(" ")}`)) depth = "GATE";
  if (input.consequenceReach.level === "EXTENSIVE") depth = laterDepth(depth, "GATE");
  else if (input.consequenceReach.level === "BROAD") depth = laterDepth(depth, consequenceRank[consequence] >= consequenceRank.HIGH ? "STEP_UP" : "VERIFY");
  return { depth, changes };
}

function challengesFor(input: AdaptiveVerificationInput, depth: VerificationDepth, consequence: AdaptiveConsequenceClass, policy: AdaptiveVerificationPolicy): VerificationChallenge[] {
  if (depth === "OBSERVE") return [];
  const challenges: VerificationChallenge[] = ["VERIFY_IDENTITY", "VERIFY_AUTHORITY"];
  if (input.entity.type === "HUMAN") challenges.push("VERIFY_DEVICE");
  if (["AI_AGENT", "SOFTWARE_AGENT"].includes(input.entity.type)) challenges.push("VERIFY_AGENT_CONFIGURATION", "VERIFY_RUNTIME");
  if ([...(input.materialChanges ?? []), ...input.forecast.materialChanges, ...input.forecast.forecastSignals].some((item) => /MODEL_STATE|MODEL_TEMPLATE|MODEL_ARTIFACT|MODEL_ENDPOINT|MODEL_RUNTIME_AUTH|MODEL_ROUTER|VALIDATION_REASSESSMENT|REVALIDATION/.test(item))) challenges.push("VERIFY_MODEL_STATE");
  if (["WORKLOAD", "MACHINE", "ROBOT"].includes(input.entity.type)) challenges.push("VERIFY_RUNTIME", "VERIFY_MACHINE_STATE");
  if (depth === "STEP_UP" || depth === "GATE") challenges.push("VERIFY_MONITORING");
  if ([...(input.materialChanges ?? []), ...input.forecast.materialChanges, ...input.forecast.forecastSignals].some((item) => /POLICY/.test(item))) challenges.push("VERIFY_POLICY_ACKNOWLEDGEMENT");
  if (depth === "GATE" || input.consequenceReach.destinations.length > 0 && consequenceRank[consequence] >= consequenceRank.MATERIAL) challenges.push("VERIFY_DESTINATION");
  if (policy.requiredHumanApprovalConsequences.includes(consequence) || input.entity.type === "HUMAN" && consequenceRank[consequence] >= consequenceRank.HIGH) challenges.push("VERIFY_HUMAN_INTENT");
  return unique(challenges) as VerificationChallenge[];
}

function requirementFor(challenge: VerificationChallenge, input: AdaptiveVerificationInput, depth: VerificationDepth, policy: AdaptiveVerificationPolicy): VerificationEvidenceRequirement {
  const reasonByChallenge: Record<VerificationChallenge, string> = {
    VERIFY_IDENTITY: "Demonstrate continuity with the entity that owns the requested action context.",
    VERIFY_DEVICE: "Demonstrate current device or session continuity without requiring biometrics by default.",
    VERIFY_RUNTIME: "Demonstrate that the runtime remains the runtime qualified for this authority and action.",
    VERIFY_AGENT_CONFIGURATION: "Demonstrate continuity of model, configuration, toolset, provenance, and delegated purpose.",
    VERIFY_MODEL_STATE: "Demonstrate that the current observed model state corresponds to the approved model-state baseline for this action.",
    VERIFY_AUTHORITY: "Demonstrate current authority lineage and downstream authorization propagation.",
    VERIFY_HUMAN_INTENT: "Demonstrate current accountable human intent or approval for the consequential action.",
    VERIFY_DESTINATION: "Demonstrate that the destination is bound to the approved execution path.",
    VERIFY_MONITORING: "Demonstrate current monitoring coverage for the consequential path.",
    VERIFY_MACHINE_STATE: "Demonstrate current machine, firmware, sensor, or physical-boundary state where available.",
    VERIFY_POLICY_ACKNOWLEDGEMENT: "Demonstrate evaluation against the current versioned enterprise policy.",
  };
  const entityFreshnessFactor = input.entity.type === "ROBOT" || input.entity.type === "MACHINE" ? 0.5 : 1;
  return {
    challenge,
    required: true,
    reason: reasonByChallenge[challenge],
    acceptableProviderClasses: providerClasses[challenge],
    maximumAgeMinutes: Math.max(1, Math.round(policy.freshnessMinutes[depth] * entityFreshnessFactor)),
    minimumConfidence: policy.minimumConfidence[depth],
    resolves: conditionByChallenge[challenge],
  };
}

function challengeFromEvidence(evidence: VerificationEvidenceInput): VerificationChallenge | null {
  if (evidence.challenge && VERIFICATION_CHALLENGES.includes(evidence.challenge)) return evidence.challenge;
  const type = evidence.evidenceType.toUpperCase();
  if (/MFA|IDENTITY|SSO|WORKFORCE/.test(type)) return "VERIFY_IDENTITY";
  if (/DEVICE|SESSION/.test(type)) return "VERIFY_DEVICE";
  if (/RUNTIME|ATTESTATION/.test(type)) return "VERIFY_RUNTIME";
  if (/MODEL_STATE|MODEL_ARTIFACT|MODEL_TEMPLATE_INTEGRITY/.test(type)) return "VERIFY_MODEL_STATE";
  if (/MODEL|TOOL|CONFIGURATION|AGENT/.test(type)) return "VERIFY_AGENT_CONFIGURATION";
  if (/AUTHORITY|IAM|CREDENTIAL|PERMISSION/.test(type)) return "VERIFY_AUTHORITY";
  if (/INTENT|APPROVAL/.test(type)) return "VERIFY_HUMAN_INTENT";
  if (/DESTINATION|DSPM|DATA_BOUNDARY/.test(type)) return "VERIFY_DESTINATION";
  if (/MONITOR|EDR|OBSERVABILITY/.test(type)) return "VERIFY_MONITORING";
  if (/MACHINE|FIRMWARE|ROBOT|SENSOR/.test(type)) return "VERIFY_MACHINE_STATE";
  if (/POLICY|ACKNOWLEDGEMENT/.test(type)) return "VERIFY_POLICY_ACKNOWLEDGEMENT";
  return null;
}

function invalidatingChange(challenge: VerificationChallenge, changes: string[]) {
  const pattern: Record<VerificationChallenge, RegExp> = {
    VERIFY_IDENTITY: /IDENTITY|OWNER|PRINCIPAL/,
    VERIFY_DEVICE: /DEVICE|SESSION|LOCATION/,
    VERIFY_RUNTIME: /RUNTIME|ENVIRONMENT|FIRMWARE/,
    VERIFY_AGENT_CONFIGURATION: /MODEL|TOOL|CONFIGURATION|PROMPT/,
    VERIFY_MODEL_STATE: /MODEL_STATE|MODEL_TEMPLATE|MODEL_ARTIFACT|MODEL_ENDPOINT|MODEL_RUNTIME_AUTH|MODEL_ROUTER|VALIDATION|REVALIDATION/,
    VERIFY_AUTHORITY: /AUTHORITY|PRIVILEGE|CREDENTIAL|PERMISSION/,
    VERIFY_HUMAN_INTENT: /INTENT|APPROVER|HUMAN_APPROVAL/,
    VERIFY_DESTINATION: /DESTINATION|DATA_BOUNDARY/,
    VERIFY_MONITORING: /MONITORING|OBSERVABILITY/,
    VERIFY_MACHINE_STATE: /MACHINE|ROBOT|FIRMWARE|SENSOR|PHYSICAL/,
    VERIFY_POLICY_ACKNOWLEDGEMENT: /POLICY/,
  };
  return changes.some((change) => pattern[challenge].test(change));
}

function currentFor(requirement: VerificationEvidenceRequirement, input: AdaptiveVerificationInput, changes: string[]): CurrentVerificationEvidence {
  const evidence = [...(input.evidence ?? [])]
    .filter((item) => challengeFromEvidence(item) === requirement.challenge)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
  const fallback = condition(input, conditionByChallenge[requirement.challenge]);
  const observedAt = evidence?.observedAt ?? fallback?.lastVerifiedAt ?? null;
  const evidenceReferences = unique(evidence?.evidenceReferences ?? fallback?.evidenceReferences ?? []);
  const expiresAt = evidence?.expiresAt ?? null;
  const positive = evidence ? /PASS|SUCCEED|VERIFIED|CURRENT|VALID|COMPLETE|STABLE/i.test(evidence.outcome) : Boolean(fallback && ["STRONG", "COMPLETE", "STABLE"].includes(fallback.status));
  const negative = evidence ? /FAIL|REVOKED|INVALID|DENIED|EXPIRED/i.test(evidence.outcome) : Boolean(fallback && ["ELEVATED", "SEVERE"].includes(fallback.status));
  const confidence = clamp(evidence?.assurance ?? fallback?.confidence ?? 0);
  if (!observedAt || !evidenceReferences.length) return { challenge: requirement.challenge, status: "MISSING", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: "UNAVAILABLE", confidence, evidenceReferences, reason: "Required provider-neutral evidence is unavailable." };
  const invalidated = invalidatingChange(requirement.challenge, changes) && !evidence?.retestReference && !fallback?.trend?.includes("IMPROVING");
  if (invalidated) return { challenge: requirement.challenge, status: "INVALIDATED_BY_CHANGE", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: "INVALIDATED", confidence, evidenceReferences, reason: "Material change invalidated the previous proof for this context." };
  const evaluated = Date.parse(input.evaluatedAt);
  const ageMinutes = (evaluated - Date.parse(observedAt)) / 60_000;
  const expired = Boolean(expiresAt && Date.parse(expiresAt) <= evaluated);
  if (expired) return { challenge: requirement.challenge, status: "STALE", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: "EXPIRED", confidence, evidenceReferences, reason: "Provider evidence has expired." };
  if (ageMinutes > requirement.maximumAgeMinutes) return { challenge: requirement.challenge, status: "STALE", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: "STALE", confidence, evidenceReferences, reason: `Evidence exceeds the contextual ${requirement.maximumAgeMinutes}-minute freshness window.` };
  if (negative) return { challenge: requirement.challenge, status: "FAIL", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: "CURRENT", confidence, evidenceReferences, reason: "Current evidence does not satisfy the required proof." };
  if (!positive || confidence < requirement.minimumConfidence) return { challenge: requirement.challenge, status: "INCONCLUSIVE", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: ageMinutes > requirement.maximumAgeMinutes * 0.75 ? "AGING" : "CURRENT", confidence, evidenceReferences, reason: "Evidence is current but insufficient for the contextual confidence requirement." };
  return { challenge: requirement.challenge, status: "PASS", providerClass: evidence?.providerClass ?? null, providerKey: evidence?.providerKey ?? null, observedAt, expiresAt, freshness: ageMinutes > requirement.maximumAgeMinutes * 0.75 ? "AGING" : "CURRENT", confidence, evidenceReferences, reason: "Current evidence satisfies the contextual requirement." };
}

function graphProjection(input: AdaptiveVerificationInput, verificationId: string, consequence: AdaptiveConsequenceClass, requirements: VerificationEvidenceRequirement[], current: CurrentVerificationEvidence[], trustGap: TrustGap): TrustForecastGraphProjection {
  const requirementId = `${verificationId}:requirement`;
  const consequenceId = `${verificationId}:consequence`;
  const gapId = trustGap.gapId;
  const proofId = `${verificationId}:proof`;
  const nodes: TrustForecastGraphProjection["nodes"] = [
    { nodeType: "AUTHORITY", externalId: input.authorityReference, domainKey: "AUTHORITY", label: "Authority at verification time", metadata: { scopeValid: input.authorityScopeValid } },
    { nodeType: "CONSEQUENCE", externalId: consequenceId, domainKey: "GOVERNANCE", label: consequence, metadata: { reach: input.consequenceReach.level } },
    { nodeType: "VERIFICATION_REQUIREMENT", externalId: requirementId, domainKey: "GOVERNANCE", label: "Adaptive verification requirement", metadata: {} },
    { nodeType: "TRUST_GAP", externalId: gapId, domainKey: "GOVERNANCE", label: trustGap.status, metadata: { missingEvidence: trustGap.missingEvidence } },
    { nodeType: "STEP_UP", externalId: `${verificationId}:step-up`, domainKey: "GOVERNANCE", label: trustGap.minimumProofRequired.primaryChallenge ?? "NO_STEP_UP", metadata: { advisoryOnly: true } },
    { nodeType: "PROOF", externalId: proofId, domainKey: "EVIDENCE", label: trustGap.exists ? "Proof pending" : "Minimum proof satisfied", metadata: { verifiedDoesNotMeanAuthorized: true } },
  ];
  const edges: TrustForecastGraphProjection["edges"] = [
    { fromNodeType: "ENTITY", fromExternalId: input.entity.id, toNodeType: "AUTHORITY", toExternalId: input.authorityReference, edgeType: "APPLIES_TO" },
    { fromNodeType: "AUTHORITY", fromExternalId: input.authorityReference, toNodeType: "CONSEQUENCE", toExternalId: consequenceId, edgeType: "APPLIES_TO" },
    { fromNodeType: "CONSEQUENCE", fromExternalId: consequenceId, toNodeType: "VERIFICATION_REQUIREMENT", toExternalId: requirementId, edgeType: "TRIGGERED" },
    { fromNodeType: "VERIFICATION_REQUIREMENT", fromExternalId: requirementId, toNodeType: "TRUST_GAP", toExternalId: gapId, edgeType: "RESULTED_IN" },
    { fromNodeType: "TRUST_GAP", fromExternalId: gapId, toNodeType: "STEP_UP", toExternalId: `${verificationId}:step-up`, edgeType: "TRIGGERED" },
    { fromNodeType: "STEP_UP", fromExternalId: `${verificationId}:step-up`, toNodeType: "PROOF", toExternalId: proofId, edgeType: "APPLIES_TO" },
  ];
  for (const requirement of requirements) {
    const evidence = current.find((item) => item.challenge === requirement.challenge)!;
    const evidenceId = `${verificationId}:evidence:${requirement.challenge}`;
    nodes.push({ nodeType: "CURRENT_EVIDENCE", externalId: evidenceId, domainKey: "EVIDENCE", label: requirement.challenge, metadata: { status: evidence.status, freshness: evidence.freshness, providerClass: evidence.providerClass } });
    edges.push({ fromNodeType: "CURRENT_EVIDENCE", fromExternalId: evidenceId, toNodeType: "VERIFICATION_REQUIREMENT", toExternalId: requirementId, edgeType: evidence.status === "PASS" ? "SUPPORTED" : "CHALLENGED" });
  }
  return { nodes, edges };
}

export function evaluateAdaptiveVerification(input: AdaptiveVerificationInput): AdaptiveVerificationRequirement {
  assertSafe(input);
  if (!uuidPattern.test(input.enterpriseId) || input.forecast.enterpriseId !== input.enterpriseId) throw new Error("ADAPTIVE_VERIFICATION_TENANT_SCOPE_MISMATCH");
  if (input.forecast.subject.id !== input.entity.id || input.forecast.subject.type !== input.entity.type) throw new Error("ADAPTIVE_VERIFICATION_SUBJECT_SCOPE_MISMATCH");
  if (!referencePattern.test(input.entity.id) || !referencePattern.test(input.authorityReference) || !Number.isFinite(Date.parse(input.evaluatedAt))) throw new TypeError("Adaptive verification input is invalid.");
  if (input.previousVerification && (input.previousVerification.enterpriseId !== input.enterpriseId || input.previousVerification.entityId !== input.entity.id)) throw new Error("ADAPTIVE_VERIFICATION_PREVIOUS_SCOPE_MISMATCH");
  const policy = policyFor(input);
  const consequence = classifyAdaptiveConsequence(input);
  const { depth, changes } = requiredDepth(input, consequence, policy);
  const requiredEvidence = challengesFor(input, depth, consequence, policy).map((challenge) => requirementFor(challenge, input, depth, policy));
  const currentEvidence = requiredEvidence.map((requirement) => currentFor(requirement, input, changes));
  const missingEvidence = currentEvidence.filter((item) => item.status !== "PASS").map((item) => item.challenge);
  const minimumSufficientProof: MinimumSufficientProof = {
    primaryChallenge: missingEvidence[0] ?? null,
    challenges: missingEvidence,
    reason: missingEvidence.length ? `Supply only the ${missingEvidence.length} missing or stale proof requirement(s); already-satisfied evidence remains valid.` : "Current proof satisfies the contextual requirement; no additional verification is necessary.",
    providerCollectionBoundary: "CYBER_SENTINELS_DEFINES_WHAT_PROVIDERS_MAY_DEFINE_HOW",
  };
  const previousGap = input.previousVerification?.trustGap.exists ?? false;
  const gapStatus: TrustGap["status"] = consequence === "UNKNOWN" && !requiredEvidence.length ? "UNKNOWN" : missingEvidence.length ? "OPEN" : previousGap ? "RESOLVED" : "NONE";
  const gapId = deterministicUuid({ enterpriseId: input.enterpriseId, entityId: input.entity.id, authorityReference: input.authorityReference, consequence, evaluatedAt: input.evaluatedAt, missingEvidence });
  const trustGap: TrustGap = {
    exists: missingEvidence.length > 0,
    status: gapStatus,
    gapId,
    consequence,
    affectedAuthority: input.authorityReference,
    missingEvidence,
    minimumProofRequired: minimumSufficientProof,
    recommendedRemediation: missingEvidence.map((challenge) => `Supply current ${challenge} evidence from an acceptable provider class.`),
  };
  const verificationStatus: VerificationStatus = depth === "OBSERVE" ? "OBSERVING" : !missingEvidence.length ? "SATISFIED" : depth === "GATE" ? "GATED_PENDING_PROOF" : depth === "STEP_UP" ? "STEP_UP_REQUIRED" : currentEvidence.every((item) => item.status === "MISSING") ? "INSUFFICIENT_EVIDENCE" : "STEP_UP_REQUIRED";
  const evidenceFreshness = !currentEvidence.length ? depth === "OBSERVE" ? "CURRENT" as const : "UNAVAILABLE" as const
    : currentEvidence.some((item) => item.freshness === "INVALIDATED") ? "INVALIDATED" as const
      : currentEvidence.some((item) => item.freshness === "EXPIRED") ? "EXPIRED" as const
        : currentEvidence.some((item) => item.freshness === "STALE") ? "STALE" as const
          : currentEvidence.some((item) => item.freshness === "AGING") ? "AGING" as const
            : currentEvidence.some((item) => item.freshness === "UNAVAILABLE") ? "UNAVAILABLE" as const : "CURRENT" as const;
  const passing = currentEvidence.filter((item) => item.status === "PASS");
  const confidence = depth === "OBSERVE" ? input.forecast.confidence : clamp(requiredEvidence.length ? passing.reduce((sum, item) => sum + item.confidence, 0) / requiredEvidence.length : 0);
  const evidenceReferences = unique(currentEvidence.flatMap((item) => item.evidenceReferences));
  const verificationId = deterministicUuid({ enterpriseId: input.enterpriseId, entity: input.entity, evaluatedAt: input.evaluatedAt, depth, consequence, requirements: requiredEvidence, evidenceReferences, policyReference: policy.policyReference });
  const graph = graphProjection(input, verificationId, consequence, requiredEvidence, currentEvidence, trustGap);
  const reason = unique([
    `${consequence} consequence and ${input.consequenceReach.level} known reach require ${depth} verification depth.`,
    `Trust Forecast is ${input.forecast.state}; Trust Pressure is ${input.trustPressure.value}; Trust Budget is ${input.trustBudget.remaining}/${input.trustBudget.total}.`,
    ...(changes.length ? [`${changes.length} material trust signal(s) were evaluated for proof invalidation.`] : []),
    ...(missingEvidence.length ? [`${missingEvidence.length} proof requirement(s) remain missing, stale, invalidated, failed, or inconclusive.`] : ["Current proof satisfies the minimum contextual requirement."]),
  ]);
  const replayEvents = [{ eventType: "ADAPTIVE_VERIFICATION_EVALUATED", occurredAt: input.evaluatedAt, evidenceReferences, details: { verificationId, requiredVerificationDepth: depth, verificationStatus, consequence, missingEvidence, policyReference: policy.policyReference, verifiedDoesNotMeanAuthorized: true } }];
  const memoryTypes = unique([
    ...(depth === "STEP_UP" && missingEvidence.length ? ["VERIFICATION_STEP_UP_REQUIRED"] : []),
    ...(depth === "GATE" && missingEvidence.length ? ["VERIFICATION_GATE_REQUIRED"] : []),
    ...(["STALE", "EXPIRED", "INVALIDATED"].includes(evidenceFreshness) ? ["VERIFICATION_STALE"] : []),
    ...(trustGap.status === "OPEN" && !previousGap ? ["TRUST_GAP_DISCOVERED"] : []),
    ...(trustGap.status === "RESOLVED" ? ["TRUST_GAP_RESOLVED", "VERIFICATION_STEP_UP_SUCCEEDED"] : []),
  ]);
  const trustMemoryEvents = memoryTypes.map((eventType) => ({ eventId: hashCanonical([verificationId, eventType]), eventType, occurredAt: input.evaluatedAt, evidenceReferences }));
  const lastVerifiedAt = passing.map((item) => item.observedAt).filter((item): item is string => Boolean(item)).sort().at(-1) ?? input.previousVerification?.lastVerifiedAt ?? null;
  const core = {
    verificationVersion: "1.0" as const,
    verificationId,
    label: "ADAPTIVE_TRUST_VERIFICATION" as const,
    enterpriseId: input.enterpriseId,
    entityId: input.entity.id,
    entityType: input.entity.type,
    requiredVerificationDepth: depth,
    verificationStatus,
    reason,
    consequence,
    requiredEvidence,
    currentEvidence,
    missingEvidence,
    evidenceFreshness,
    minimumSufficientProof,
    minimumStepUp: minimumSufficientProof.primaryChallenge,
    confidence,
    policyReference: policy.policyReference,
    policyVersion: policy.policyVersion,
    lastVerifiedAt,
    stepUpReason: currentEvidence.filter((item) => item.status !== "PASS").map((item) => item.reason),
    verificationProviderClasses: unique(requiredEvidence.flatMap((item) => item.acceptableProviderClasses)),
    trustGap,
    graphProjection: graph,
    replayEvents,
    trustMemoryEvents,
    canonicalAuthorityBoundary: { verifiedDoesNotMeanAuthorized: true as const, verificationCanGrantAuthority: false as const, verificationCanAllow: false as const, verificationCanDeny: false as const, lowTrustMeansMalicious: false as const, decisionAuthority: "CANONICAL_TRUST_FABRIC_ONLY" as const },
    source: "DERIVED_FROM_TRUST_TWIN_AND_CANONICAL_EVIDENCE" as const,
    knownLimitations: [
      "Verification depth and freshness are explainable policy-driven requirements, not identity, fraud, maliciousness, or incident predictions.",
      "Provider evidence may satisfy proof requirements but never grants authority or owns the canonical decision.",
      "Unknown consequence and missing proof are never silently classified as low consequence or malicious intent.",
    ],
    evaluatedAt: input.evaluatedAt,
  };
  return deepFreeze({ ...core, verificationDigest: hashCanonical(core) }) as AdaptiveVerificationRequirement;
}

export type AdaptiveVerificationCoverage = {
  coverageVersion: "1.0";
  enterpriseId: string;
  generatedAt: string;
  knownEntities: number;
  verifiedEntities: number;
  observedEntities: number;
  staleVerification: number;
  insufficientEvidence: number;
  stepUpRequired: number;
  unverifiedConsequentialAuthority: number;
  highestPriority: Array<{ entityId: string; entityType: ForecastSubjectType; authorityReference: string; consequence: AdaptiveConsequenceClass; verificationDepth: VerificationDepth; verificationStatus: VerificationStatus; missingEvidence: VerificationChallenge[]; minimumProof: VerificationChallenge | null }>;
  derivedOnly: true;
  genericAssetInventory: false;
};

export function createAdaptiveVerificationCoverage(input: { enterpriseId: string; generatedAt: string; requirements: AdaptiveVerificationRequirement[] }): AdaptiveVerificationCoverage {
  if (!uuidPattern.test(input.enterpriseId) || !Number.isFinite(Date.parse(input.generatedAt))) throw new TypeError("Adaptive verification coverage scope is invalid.");
  if (input.requirements.some((item) => item.enterpriseId !== input.enterpriseId)) throw new Error("ADAPTIVE_VERIFICATION_COVERAGE_TENANT_SCOPE_MISMATCH");
  const requirements = [...new Map(input.requirements.map((item) => [item.entityId, item])).values()];
  const consequential = requirements.filter((item) => ["HIGH", "CRITICAL"].includes(item.consequence) && item.verificationStatus !== "SATISFIED");
  const priority = [...consequential, ...requirements.filter((item) => item.trustGap.exists && !consequential.includes(item))]
    .sort((a, b) => depthRank[b.requiredVerificationDepth] - depthRank[a.requiredVerificationDepth] || consequenceRank[b.consequence] - consequenceRank[a.consequence] || b.missingEvidence.length - a.missingEvidence.length)
    .slice(0, 10)
    .map((item) => ({ entityId: item.entityId, entityType: item.entityType, authorityReference: item.trustGap.affectedAuthority, consequence: item.consequence, verificationDepth: item.requiredVerificationDepth, verificationStatus: item.verificationStatus, missingEvidence: item.missingEvidence, minimumProof: item.minimumStepUp }));
  return deepFreeze({
    coverageVersion: "1.0" as const,
    enterpriseId: input.enterpriseId,
    generatedAt: input.generatedAt,
    knownEntities: requirements.length,
    verifiedEntities: requirements.filter((item) => item.verificationStatus === "SATISFIED").length,
    observedEntities: requirements.filter((item) => item.requiredVerificationDepth === "OBSERVE").length,
    staleVerification: requirements.filter((item) => ["STALE", "EXPIRED", "INVALIDATED"].includes(item.evidenceFreshness)).length,
    insufficientEvidence: requirements.filter((item) => item.verificationStatus === "INSUFFICIENT_EVIDENCE").length,
    stepUpRequired: requirements.filter((item) => ["STEP_UP_REQUIRED", "GATED_PENDING_PROOF"].includes(item.verificationStatus)).length,
    unverifiedConsequentialAuthority: consequential.length,
    highestPriority: priority,
    derivedOnly: true as const,
    genericAssetInventory: false as const,
  }) as AdaptiveVerificationCoverage;
}
