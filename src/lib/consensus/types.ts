export const providerStates = ["ACTIVE", "DEGRADED", "DISABLED", "UNAVAILABLE", "UNSUPPORTED", "BLOCKED"] as const;
export const providerHealthStates = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "DISABLED", "UNKNOWN", "BLOCKED"] as const;
export const observationResults = ["PASS", "FAIL", "INCONCLUSIVE", "UNAVAILABLE", "BLOCKED", "UNSUPPORTED", "REVOKED"] as const;
export const consensusTrustStates = ["VERIFIED", "TRUSTED", "CHALLENGED", "INCONCLUSIVE", "BLOCKED", "REVOKED"] as const;
export const conflictSeverities = ["NONE", "LOW", "MATERIAL", "CRITICAL"] as const;
export const independenceGroups = ["government_identity", "identity_orchestration", "device_reputation", "email_reputation", "phone_reputation", "network_risk", "behavioral_signal", "enterprise_authority"] as const;

export type ProviderState = (typeof providerStates)[number];
export type ProviderHealthState = (typeof providerHealthStates)[number];
export type ObservationResult = (typeof observationResults)[number];
export type ConsensusTrustState = (typeof consensusTrustStates)[number];
export type ConflictSeverity = (typeof conflictSeverities)[number];
export type IndependenceGroup = (typeof independenceGroups)[number];

export type ProviderCapability = {
  providerKey: string; displayName: string; version: string; state: ProviderState;
  baseWeight: number; positiveEvidence: boolean; supportedSignals: string[];
  independenceGroup: IndependenceGroup; cryptographicVerificationRequired: boolean;
  serverVerificationRequired: boolean; freshnessWindowSeconds: number; reasonCodes: string[];
};

export type ProviderConsensusHealthSnapshot = {
  providerKey: string; state: ProviderHealthState; observedAt: string;
  latencyMs: number | null; errorRate: number | null; timeoutRate: number | null;
  signatureFailures: number; schemaFailures: number; circuitOpen: boolean; reasonCodes: string[];
};

export type ProviderObservation = {
  observationId: string; enterpriseId: string; subjectId: string; workflowId: string | null;
  providerKey: string; signalType: string; result: ObservationResult; assurance: number;
  quality: number; signatureVerified: boolean; serverVerified: boolean; authoritative: boolean;
  evidenceDigest: string; evidenceReference: string; correlationKey: string | null;
  occurredAt: string; receivedAt: string; expiresAt: string | null;
  supersedesObservationId: string | null; revokedObservationId: string | null; reasonCodes: string[];
};

export type ConsensusPolicy = {
  policyId: string; version: string; name: string; active: boolean;
  verifiedThreshold: number; trustedThreshold: number; blockingThreshold: number;
  minimumIndependentGroupsVerified: number; minimumIndependentGroupsTrusted: number;
  mandatorySignals: string[]; materialConflictOutcome: "CHALLENGED" | "BLOCKED";
  criticalRevocationOutcome: "REVOKED" | "BLOCKED"; staleEvidenceMode: "ZERO" | "DECAY";
  correlationPenalty: number; signalMultipliers: Record<string, number>; validFrom: string;
};

export type ConsensusConflict = {
  conflictId: string; severity: ConflictSeverity; type: string;
  observationIds: string[]; reasonCode: string; explanation: string;
};

export type DecisionEvidence = {
  observationId: string; providerKey: string; result: ObservationResult; included: boolean;
  ignoredReason: string | null; effectiveWeight: number; freshnessMultiplier: number;
  independenceMultiplier: number; independenceGroup: IndependenceGroup | null;
};

export type ConsensusDecision = {
  decisionId: string; enterpriseId: string; subjectId: string; workflowId: string | null;
  policyId: string; policyVersion: string; evaluatedAt: string; state: ConsensusTrustState;
  priorState: ConsensusTrustState | null; confidence: number; reasonCodes: string[];
  evidenceSnapshotHash: string; idempotencyKey: string; evidence: DecisionEvidence[];
  conflicts: ConsensusConflict[]; thresholds: Record<string, number>; priorDecisionId: string | null;
  decisionHash: string; simulated: boolean;
};

/** Provider Consensus recommends a state; it never authoritatively changes current trust state. */
export type ConsensusRecommendation = ConsensusDecision & {
  recommendationId: string;
  recommendedState: ConsensusTrustState;
  recommendationKind: "CONSENSUS_RECOMMENDATION";
};

function object(value: unknown, name: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object.`); return value as Record<string, unknown>; }
function text(value: unknown, name: string) { if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required.`); return value.trim(); }
function bounded(value: unknown, name: string) { const number = Number(value); if (!Number.isFinite(number) || number < 0 || number > 1) throw new Error(`${name} must be between 0 and 1.`); return number; }
function iso(value: unknown, name: string) { const result = text(value, name); if (!Number.isFinite(Date.parse(result))) throw new Error(`${name} must be an ISO timestamp.`); return new Date(result).toISOString(); }
function strings(value: unknown) { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))] : []; }

export function validateProviderObservation(value: unknown): ProviderObservation {
  const row = object(value, "ProviderObservation");
  const result = text(row.result, "result") as ObservationResult;
  if (!observationResults.includes(result)) throw new Error("Observation result is unsupported.");
  const digest = text(row.evidenceDigest, "evidenceDigest").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("evidenceDigest must be SHA-256.");
  return {
    observationId: text(row.observationId, "observationId"), enterpriseId: text(row.enterpriseId, "enterpriseId"),
    subjectId: text(row.subjectId, "subjectId"), workflowId: typeof row.workflowId === "string" && row.workflowId.trim() ? row.workflowId.trim() : null,
    providerKey: text(row.providerKey, "providerKey").toLowerCase(), signalType: text(row.signalType, "signalType"), result,
    assurance: bounded(row.assurance, "assurance"), quality: bounded(row.quality, "quality"),
    signatureVerified: row.signatureVerified === true, serverVerified: row.serverVerified === true, authoritative: row.authoritative === true,
    evidenceDigest: digest, evidenceReference: text(row.evidenceReference, "evidenceReference"),
    correlationKey: typeof row.correlationKey === "string" && row.correlationKey.trim() ? row.correlationKey.trim() : null,
    occurredAt: iso(row.occurredAt, "occurredAt"), receivedAt: iso(row.receivedAt, "receivedAt"),
    expiresAt: typeof row.expiresAt === "string" ? iso(row.expiresAt, "expiresAt") : null,
    supersedesObservationId: typeof row.supersedesObservationId === "string" ? row.supersedesObservationId : null,
    revokedObservationId: typeof row.revokedObservationId === "string" ? row.revokedObservationId : null, reasonCodes: strings(row.reasonCodes),
  };
}

export function validateProviderCapability(value:unknown):ProviderCapability{const row=object(value,"ProviderCapability");const state=text(row.state,"state") as ProviderState;if(!providerStates.includes(state))throw new Error("Provider state is unsupported.");const group=text(row.independenceGroup,"independenceGroup") as IndependenceGroup;if(!independenceGroups.includes(group))throw new Error("Independence group is unsupported.");return {providerKey:text(row.providerKey,"providerKey").toLowerCase(),displayName:text(row.displayName,"displayName"),version:text(row.version,"version"),state,baseWeight:bounded(row.baseWeight,"baseWeight"),positiveEvidence:row.positiveEvidence===true,supportedSignals:strings(row.supportedSignals),independenceGroup:group,cryptographicVerificationRequired:row.cryptographicVerificationRequired===true,serverVerificationRequired:row.serverVerificationRequired===true,freshnessWindowSeconds:Math.max(0,Math.floor(Number(row.freshnessWindowSeconds))),reasonCodes:strings(row.reasonCodes)};}

export function validateConsensusPolicy(value: unknown): ConsensusPolicy {
  const row = object(value, "ConsensusPolicy");
  const material = row.materialConflictOutcome === "BLOCKED" ? "BLOCKED" : "CHALLENGED";
  const revocation = row.criticalRevocationOutcome === "BLOCKED" ? "BLOCKED" : "REVOKED";
  return {
    policyId: text(row.policyId, "policyId"), version: text(row.version, "version"), name: text(row.name, "name"), active: row.active === true,
    verifiedThreshold: Math.round(bounded(Number(row.verifiedThreshold) / 100, "verifiedThreshold") * 100),
    trustedThreshold: Math.round(bounded(Number(row.trustedThreshold) / 100, "trustedThreshold") * 100),
    blockingThreshold: bounded(row.blockingThreshold, "blockingThreshold"),
    minimumIndependentGroupsVerified: Math.max(1, Math.floor(Number(row.minimumIndependentGroupsVerified))),
    minimumIndependentGroupsTrusted: Math.max(1, Math.floor(Number(row.minimumIndependentGroupsTrusted))), mandatorySignals: strings(row.mandatorySignals),
    materialConflictOutcome: material, criticalRevocationOutcome: revocation, staleEvidenceMode: row.staleEvidenceMode === "DECAY" ? "DECAY" : "ZERO",
    correlationPenalty: bounded(row.correlationPenalty, "correlationPenalty"),
    signalMultipliers: Object.fromEntries(Object.entries(object(row.signalMultipliers ?? {}, "signalMultipliers")).map(([key, entry]) => [key, bounded(entry, `signalMultipliers.${key}`)])),
    validFrom: iso(row.validFrom, "validFrom"),
  };
}

export function validateConsensusDecision(value:unknown):ConsensusDecision{const row=object(value,"ConsensusDecision");const state=text(row.state,"state") as ConsensusTrustState;if(!consensusTrustStates.includes(state))throw new Error("Consensus state is unsupported.");const prior=row.priorState===null||row.priorState===undefined?null:text(row.priorState,"priorState") as ConsensusTrustState;if(prior&&!consensusTrustStates.includes(prior))throw new Error("Prior consensus state is unsupported.");const hash=text(row.decisionHash,"decisionHash").toLowerCase();const snapshot=text(row.evidenceSnapshotHash,"evidenceSnapshotHash").toLowerCase();if(!/^[a-f0-9]{64}$/.test(hash)||!/^[a-f0-9]{64}$/.test(snapshot))throw new Error("Decision integrity hashes must be SHA-256.");return {decisionId:text(row.decisionId,"decisionId"),enterpriseId:text(row.enterpriseId,"enterpriseId"),subjectId:text(row.subjectId,"subjectId"),workflowId:typeof row.workflowId==="string"&&row.workflowId?row.workflowId:null,policyId:text(row.policyId,"policyId"),policyVersion:text(row.policyVersion,"policyVersion"),evaluatedAt:iso(row.evaluatedAt,"evaluatedAt"),state,priorState:prior,confidence:Math.max(0,Math.min(100,Math.round(Number(row.confidence)))),reasonCodes:strings(row.reasonCodes),evidenceSnapshotHash:snapshot,idempotencyKey:text(row.idempotencyKey,"idempotencyKey"),evidence:Array.isArray(row.evidence)?row.evidence.map((entry)=>{const item=object(entry,"DecisionEvidence");return {observationId:text(item.observationId,"observationId"),providerKey:text(item.providerKey,"providerKey"),result:text(item.result,"result") as ObservationResult,included:item.included===true,ignoredReason:typeof item.ignoredReason==="string"?item.ignoredReason:null,effectiveWeight:Number(item.effectiveWeight),freshnessMultiplier:bounded(item.freshnessMultiplier,"freshnessMultiplier"),independenceMultiplier:bounded(item.independenceMultiplier,"independenceMultiplier"),independenceGroup:typeof item.independenceGroup==="string"?item.independenceGroup as IndependenceGroup:null};}):[],conflicts:Array.isArray(row.conflicts)?row.conflicts.map((entry)=>{const item=object(entry,"ConsensusConflict");return {conflictId:text(item.conflictId,"conflictId"),severity:text(item.severity,"severity") as ConflictSeverity,type:text(item.type,"type"),observationIds:strings(item.observationIds),reasonCode:text(item.reasonCode,"reasonCode"),explanation:text(item.explanation,"explanation")};}):[],thresholds:Object.fromEntries(Object.entries(object(row.thresholds??{},"thresholds")).map(([key,entry])=>[key,Number(entry)])),priorDecisionId:typeof row.priorDecisionId==="string"?row.priorDecisionId:null,decisionHash:hash,simulated:row.simulated===true};}
