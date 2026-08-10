import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export const ENFORCEMENT_ELIGIBILITY_VERSION = "enforcement-eligibility-v1" as const;
export const EXECUTION_CORRELATION_VERSION = "execution-correlation-v1" as const;
export const OUTCOME_CONFIRMATION_VERSION = "outcome-confirmation-v1" as const;

export type TrustDecision = "ALLOW" | "REVIEW" | "DENY";
export type EnforcementStatus = "ACCEPTED" | "REJECTED" | "FAILED" | "TIMEOUT" | "UNKNOWN";
export type CorrelationState = "CONFIRMED" | "PARTIALLY_CONFIRMED" | "CONTRADICTED" | "UNCONFIRMED";
export type OutcomeState = "CONFIRMED" | "UNKNOWN" | "CONTROL_FAILURE_CRITICAL";
export type EvidenceIndependence = "SAME_PARTY" | "INDEPENDENT" | "UNKNOWN";

export type AuthorizedAction = {
  type: string;
  target: string;
  environment: string;
  payloadDigest?: string;
  consequence?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
};

export type EnforcementRequest = {
  requestId: string;
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  authorityId: string;
  delegationId: string;
  action: AuthorizedAction;
  actionDigest: string;
  decisionDigest: string;
  idempotencyKey: string;
  requestedAt: string;
};

export type HumanApproval = {
  approvalId: string;
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  actionDigest: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string;
  nonTransferable: true;
};

export type CurrentEnforcementState = {
  enterpriseId: string;
  operationalEntityId: string;
  authorityId: string;
  delegationId: string;
  authorityActive: boolean;
  delegationActive: boolean;
  identityVerified: boolean;
  ownerConfirmed: boolean;
  runtimeContinuity: "MATCH" | "CHANGED" | "UNKNOWN";
};

export type EnforcementAcknowledgement = {
  acknowledgementId: string;
  enterpriseId: string;
  transactionId: string;
  requestId: string;
  operationalEntityId: string;
  actionDigest: string;
  target: string;
  idempotencyKey: string;
  status: EnforcementStatus;
  adapterReference: string | null;
  acknowledgedAt: string;
  sourcePartyId: string;
};

export type ExecutionClaim = {
  claimId: string;
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  actionDigest: string;
  target: string;
  idempotencyKey: string;
  result: "SUCCEEDED" | "FAILED" | "UNKNOWN";
  claimedAt: string;
  sourcePartyId: string;
};

export type RuntimeObservation = {
  observationId: string;
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  actionDigest: string;
  target: string;
  idempotencyKey: string;
  result: "OBSERVED" | "NOT_OBSERVED" | "FAILED";
  observedAt: string;
  sourcePartyId: string;
};

export type DestinationObservation = {
  observationId: string;
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  destinationId: string;
  action: string;
  target: string;
  actionDigest: string;
  idempotencyKey: string;
  observedAt: string;
  expiresAt: string;
  result: "OBSERVED" | "FAILED";
  destinationReference: string;
  evidenceDigest: string;
  evidenceMac: string;
  sourcePartyId: string;
};

export type EnforcementAdapterResult = {
  status: EnforcementStatus;
  adapterReference: string | null;
  acknowledgedAt: string;
  executionClaim: ExecutionClaim | null;
  runtimeObservation: RuntimeObservation | null;
  destinationObservation: DestinationObservation | null;
  reasonCodes: string[];
};

export type ExecutionCorrelation = {
  state: CorrelationState;
  outcome: OutcomeState;
  controlStatus: "EFFECTIVE" | "UNKNOWN" | "CRITICAL_FAILURE";
  reasonCodes: string[];
  contradictionCodes: string[];
  evidenceIndependence: EvidenceIndependence;
  algorithmVersions: [typeof EXECUTION_CORRELATION_VERSION, typeof OUTCOME_CONFIRMATION_VERSION];
  correlationDigest: string;
};

export class NativeEnforcementError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "NativeEnforcementError";
    this.code = code;
    this.status = status;
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const referencePattern = /^[A-Za-z0-9_.:/-]{1,240}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const actionPattern = /^[A-Z][A-Z0-9_]{0,63}$/;

function exactString(value: string, name: string, pattern = referencePattern) {
  if (!pattern.test(value)) throw new NativeEnforcementError(`${name} is invalid.`, "ENFORCEMENT_INPUT_INVALID");
  return value;
}

function exactUuid(value: string, name: string) {
  return exactString(value, name, uuidPattern);
}

function instant(value: string, name: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new NativeEnforcementError(`${name} is invalid.`, "ENFORCEMENT_TIMESTAMP_INVALID");
  return parsed;
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function safeEqualHex(left: string, right: string) {
  if (!digestPattern.test(left) || !digestPattern.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function canonicalAuthorizedAction(action: AuthorizedAction): AuthorizedAction {
  exactString(action.type, "action type", actionPattern);
  exactString(action.target, "action target");
  exactString(action.environment, "action environment");
  if (action.payloadDigest && !digestPattern.test(action.payloadDigest)) throw new NativeEnforcementError("The action payload digest is invalid.", "ENFORCEMENT_INPUT_INVALID");
  if (action.consequence && !["LOW", "MODERATE", "HIGH", "CRITICAL"].includes(action.consequence)) throw new NativeEnforcementError("The action consequence is invalid.", "ENFORCEMENT_INPUT_INVALID");
  return {
    type: action.type,
    target: action.target,
    environment: action.environment,
    ...(action.payloadDigest ? { payloadDigest: action.payloadDigest } : {}),
    consequence: action.consequence ?? "LOW",
  };
}

export function deriveEnforcementActionDigest(input: { enterpriseId: string; transactionId: string; operationalEntityId: string; action: AuthorizedAction }) {
  return hashCanonical({
    enterpriseId: exactUuid(input.enterpriseId, "enterpriseId"),
    transactionId: exactUuid(input.transactionId, "transactionId"),
    operationalEntityId: exactString(input.operationalEntityId, "operationalEntityId"),
    action: canonicalAuthorizedAction(input.action),
  });
}

export function destinationObservationClaims(observation: Omit<DestinationObservation, "evidenceDigest" | "evidenceMac">) {
  return {
    observationId: observation.observationId,
    enterpriseId: observation.enterpriseId,
    transactionId: observation.transactionId,
    operationalEntityId: observation.operationalEntityId,
    destinationId: observation.destinationId,
    action: observation.action,
    target: observation.target,
    actionDigest: observation.actionDigest,
    idempotencyKey: observation.idempotencyKey,
    observedAt: observation.observedAt,
    expiresAt: observation.expiresAt,
    result: observation.result,
    destinationReference: observation.destinationReference,
    sourcePartyId: observation.sourcePartyId,
  };
}

export function signDestinationObservation(observation: Omit<DestinationObservation, "evidenceDigest" | "evidenceMac">, evidenceKey: string): DestinationObservation {
  if (Buffer.byteLength(evidenceKey, "utf8") < 32) throw new NativeEnforcementError("Destination evidence key must contain at least 32 bytes.", "DESTINATION_EVIDENCE_KEY_INVALID", 503);
  const claims = destinationObservationClaims(observation);
  const evidenceDigest = hashCanonical(claims);
  const evidenceMac = createHmac("sha256", evidenceKey).update(canonicalize({ ...claims, evidenceDigest }), "utf8").digest("hex");
  return { ...observation, evidenceDigest, evidenceMac };
}

export function verifyDestinationObservation(input: {
  observation: DestinationObservation;
  evidenceKey: string;
  expectedEnterpriseId: string;
  expectedTransactionId?: string;
  expectedEntityId?: string;
  now?: string;
}) {
  const { observation } = input;
  exactUuid(observation.observationId, "observationId");
  if (observation.enterpriseId !== input.expectedEnterpriseId) throw new NativeEnforcementError("Destination evidence belongs to another tenant.", "WRONG_TENANT", 403);
  if (input.expectedTransactionId && observation.transactionId !== input.expectedTransactionId) throw new NativeEnforcementError("Destination evidence belongs to another transaction.", "WRONG_TRANSACTION", 403);
  if (input.expectedEntityId && observation.operationalEntityId !== input.expectedEntityId) throw new NativeEnforcementError("Destination evidence belongs to another entity.", "WRONG_ENTITY", 403);
  if (instant(observation.expiresAt, "expiresAt") <= instant(input.now ?? new Date().toISOString(), "now")) throw new NativeEnforcementError("Destination evidence has expired.", "DESTINATION_EVIDENCE_EXPIRED", 409);
  const claims = destinationObservationClaims(observation);
  const digest = hashCanonical(claims);
  const mac = createHmac("sha256", input.evidenceKey).update(canonicalize({ ...claims, evidenceDigest: digest }), "utf8").digest("hex");
  if (!safeEqualHex(digest, observation.evidenceDigest) || !safeEqualHex(mac, observation.evidenceMac)) throw new NativeEnforcementError("Destination evidence integrity verification failed.", "DESTINATION_EVIDENCE_TAMPERED", 409);
  return true;
}

export function evaluateHumanApproval(input: { approval: HumanApproval | null; request: EnforcementRequest; now?: string }) {
  const highConsequence = ["HIGH", "CRITICAL"].includes(input.request.action.consequence ?? "LOW");
  if (!highConsequence) return { valid: true, reasonCodes: ["HUMAN_APPROVAL_NOT_REQUIRED"] };
  const approval = input.approval;
  if (!approval) return { valid: false, reasonCodes: ["HUMAN_APPROVAL_REQUIRED"] };
  const valid = approval.enterpriseId === input.request.enterpriseId
    && approval.transactionId === input.request.transactionId
    && approval.operationalEntityId === input.request.operationalEntityId
    && approval.actionDigest === input.request.actionDigest
    && approval.nonTransferable === true
    && instant(approval.approvedAt, "approvedAt") <= instant(input.now ?? new Date().toISOString(), "now")
    && instant(approval.expiresAt, "expiresAt") > instant(input.now ?? new Date().toISOString(), "now");
  return { valid, reasonCodes: valid ? ["HUMAN_APPROVAL_VALID"] : ["HUMAN_APPROVAL_INVALID"] };
}

export function evaluateEnforcementEligibility(input: {
  decision: TrustDecision;
  request: EnforcementRequest;
  current: CurrentEnforcementState;
  approval?: HumanApproval | null;
  now?: string;
}) {
  const reasons: string[] = [];
  if (input.decision !== "ALLOW") reasons.push(input.decision === "DENY" ? "DECISION_DENY_NO_ENFORCEMENT" : "DECISION_REVIEW_NO_ENFORCEMENT");
  if (input.current.enterpriseId !== input.request.enterpriseId) reasons.push("WRONG_TENANT");
  if (input.current.operationalEntityId !== input.request.operationalEntityId) reasons.push("WRONG_ENTITY");
  if (input.current.authorityId !== input.request.authorityId || input.current.delegationId !== input.request.delegationId) reasons.push("AUTHORITY_BINDING_MISMATCH");
  if (!input.current.authorityActive) reasons.push("ENFORCEMENT_CANCELLED_AUTHORITY_CHANGED");
  if (!input.current.delegationActive) reasons.push("DELEGATION_REVOKED");
  if (!input.current.identityVerified || !input.current.ownerConfirmed) reasons.push("IDENTITY_OR_OWNER_NOT_CURRENT");
  if (input.current.runtimeContinuity === "CHANGED") reasons.push("ENFORCEMENT_CANCELLED_RUNTIME_CHANGED");
  if (input.current.runtimeContinuity === "UNKNOWN") reasons.push("RUNTIME_CONTINUITY_UNKNOWN");
  const approval = evaluateHumanApproval({ approval: input.approval ?? null, request: input.request, now: input.now });
  if (!approval.valid) reasons.push(...approval.reasonCodes);
  const reasonCodes = unique(reasons);
  const eligible = reasonCodes.length === 0;
  return {
    eligible,
    state: eligible ? "ELIGIBLE" as const : reasonCodes.includes("HUMAN_APPROVAL_REQUIRED") || reasonCodes.includes("RUNTIME_CONTINUITY_UNKNOWN") ? "REVIEW_REQUIRED" as const : input.decision === "DENY" ? "DENIED" as const : "CANCELLED" as const,
    reasonCodes: eligible ? ["ENFORCEMENT_ELIGIBLE"] : reasonCodes,
    algorithmVersion: ENFORCEMENT_ELIGIBILITY_VERSION,
  };
}

function matchingEvidence(item: { enterpriseId: string; transactionId: string; operationalEntityId: string; actionDigest: string; target: string; idempotencyKey: string }, request: EnforcementRequest) {
  return item.enterpriseId === request.enterpriseId
    && item.transactionId === request.transactionId
    && item.operationalEntityId === request.operationalEntityId
    && item.actionDigest === request.actionDigest
    && item.target === request.action.target
    && item.idempotencyKey === request.idempotencyKey;
}

function withinExecutionWindow(timestamp: string, request: EnforcementRequest, now: string) {
  const observed = instant(timestamp, "evidence timestamp");
  const requested = instant(request.requestedAt, "requestedAt");
  const evaluated = instant(now, "now");
  return observed >= requested - 30_000 && observed <= evaluated + 30_000 && observed <= requested + 15 * 60_000;
}

export function correlateExecutionEvidence(input: {
  decision: TrustDecision;
  request: EnforcementRequest | null;
  acknowledgement?: EnforcementAcknowledgement | null;
  executionClaim?: ExecutionClaim | null;
  runtimeObservation?: RuntimeObservation | null;
  destinationObservations?: DestinationObservation[];
  observationEvidenceKey?: string;
  now?: string;
}): ExecutionCorrelation {
  const contradictions: string[] = [];
  const reasons: string[] = [];
  const observations = input.destinationObservations ?? [];
  const now = input.now ?? new Date().toISOString();
  const request = input.request;

  if (!request) {
    if (input.decision === "DENY" && observations.length) {
      contradictions.push("EXECUTION_OCCURRED_AFTER_DENY");
      reasons.push("CONTROL_FAILURE_CRITICAL");
    } else reasons.push(input.decision === "ALLOW" ? "ENFORCEMENT_REQUEST_MISSING" : "NO_ENFORCEMENT_EXPECTED");
  } else {
    for (const observation of observations) {
      try {
        if (input.observationEvidenceKey) verifyDestinationObservation({ observation, evidenceKey: input.observationEvidenceKey, expectedEnterpriseId: request.enterpriseId, now });
      } catch (error) {
        contradictions.push(error instanceof NativeEnforcementError ? error.code : "DESTINATION_EVIDENCE_INVALID");
        continue;
      }
      if (!matchingEvidence(observation, request)) contradictions.push("EXECUTION_EVIDENCE_CONFLICT");
      else if (!withinExecutionWindow(observation.observedAt, request, now)) contradictions.push("EXECUTION_EVIDENCE_OUTSIDE_WINDOW");
    }
    if (input.acknowledgement && !matchingEvidence(input.acknowledgement, request)) contradictions.push("FAKE_ACKNOWLEDGEMENT");
    else if (input.acknowledgement && !withinExecutionWindow(input.acknowledgement.acknowledgedAt, request, now)) contradictions.push("ACKNOWLEDGEMENT_OUTSIDE_WINDOW");
    if (input.executionClaim && !matchingEvidence(input.executionClaim, request)) contradictions.push("EXECUTION_EVIDENCE_CONFLICT");
    else if (input.executionClaim && !withinExecutionWindow(input.executionClaim.claimedAt, request, now)) contradictions.push("EXECUTION_EVIDENCE_OUTSIDE_WINDOW");
    if (input.runtimeObservation && !matchingEvidence(input.runtimeObservation, request)) contradictions.push("EXECUTION_EVIDENCE_CONFLICT");
    else if (input.runtimeObservation && !withinExecutionWindow(input.runtimeObservation.observedAt, request, now)) contradictions.push("EXECUTION_EVIDENCE_OUTSIDE_WINDOW");
    if (input.decision === "DENY" && observations.some((item) => item.result === "OBSERVED")) contradictions.push("EXECUTION_OCCURRED_AFTER_DENY");
  }

  const matchingDestinations = request ? observations.filter((item) => matchingEvidence(item, request) && withinExecutionWindow(item.observedAt, request, now) && item.result === "OBSERVED" && instant(item.expiresAt, "expiresAt") > instant(now, "now")) : [];
  const destinationConfirmed = matchingDestinations.length > 0;
  const acknowledgementAccepted = Boolean(request && input.acknowledgement && matchingEvidence(input.acknowledgement, request) && withinExecutionWindow(input.acknowledgement.acknowledgedAt, request, now) && input.acknowledgement.status === "ACCEPTED");
  const claimSupported = Boolean(request && input.executionClaim && matchingEvidence(input.executionClaim, request) && withinExecutionWindow(input.executionClaim.claimedAt, request, now) && input.executionClaim.result === "SUCCEEDED");
  const runtimeSupported = Boolean(request && input.runtimeObservation && matchingEvidence(input.runtimeObservation, request) && withinExecutionWindow(input.runtimeObservation.observedAt, request, now) && input.runtimeObservation.result === "OBSERVED");
  const critical = contradictions.includes("EXECUTION_OCCURRED_AFTER_DENY");
  const conflicted = contradictions.length > 0;
  const state: CorrelationState = critical || conflicted ? "CONTRADICTED" : destinationConfirmed ? "CONFIRMED" : acknowledgementAccepted || claimSupported || runtimeSupported ? "PARTIALLY_CONFIRMED" : "UNCONFIRMED";
  const outcome: OutcomeState = critical ? "CONTROL_FAILURE_CRITICAL" : state === "CONFIRMED" ? "CONFIRMED" : "UNKNOWN";
  if (state === "CONFIRMED") reasons.push("DESTINATION_EXECUTION_CONFIRMED");
  if (state === "PARTIALLY_CONFIRMED") reasons.push("EXECUTION_PARTIALLY_CONFIRMED");
  if (state === "UNCONFIRMED" && input.decision === "ALLOW") reasons.push("EXECUTION_UNCONFIRMED");
  if (conflicted && !critical) reasons.push("EXECUTION_EVIDENCE_CONFLICT");
  const sourceParties = new Set([
    input.acknowledgement?.sourcePartyId,
    input.executionClaim?.sourcePartyId,
    input.runtimeObservation?.sourcePartyId,
    ...matchingDestinations.map((item) => item.sourcePartyId),
  ].filter(Boolean));
  const evidenceIndependence: EvidenceIndependence = sourceParties.size > 1 ? "INDEPENDENT" : sourceParties.size === 1 ? "SAME_PARTY" : "UNKNOWN";
  const result = {
    state,
    outcome,
    controlStatus: critical ? "CRITICAL_FAILURE" as const : outcome === "CONFIRMED" ? "EFFECTIVE" as const : "UNKNOWN" as const,
    reasonCodes: unique(reasons),
    contradictionCodes: unique(contradictions),
    evidenceIndependence,
    algorithmVersions: [EXECUTION_CORRELATION_VERSION, OUTCOME_CONFIRMATION_VERSION] as ExecutionCorrelation["algorithmVersions"],
  };
  return { ...result, correlationDigest: hashCanonical(result) };
}

export function deriveOutcomeHistoryReasons(input: {
  transactionId: string;
  outcome: OutcomeState;
  history: Array<{ transactionId: string; outcome: OutcomeState }>;
}) {
  const reasons: string[] = [];
  if (input.outcome === "UNKNOWN" && input.history.some((item) => item.transactionId !== input.transactionId && item.outcome === "UNKNOWN")) reasons.push("REPEATED_ENFORCEMENT_FAILURE");
  if (input.outcome === "UNKNOWN" && input.history.some((item) => item.transactionId === input.transactionId && item.outcome === "CONFIRMED")) reasons.push("DESTINATION_EVIDENCE_LOST");
  if (input.outcome === "CONFIRMED" && input.history.some((item) => item.outcome === "CONTROL_FAILURE_CRITICAL")) reasons.push("CONTROL_RECOVERY_CONFIRMED");
  return unique(reasons);
}

export async function executeAuthorizedAction(input: {
  enterpriseId: string;
  transactionId: string;
  operationalEntityId: string;
  authorityId: string;
  delegationId: string;
  action: AuthorizedAction;
  decision: TrustDecision;
  decisionDigest: string;
  idempotencyKey: string;
  approval?: HumanApproval | null;
}, dependencies: {
  loadCurrentState(request: EnforcementRequest): Promise<CurrentEnforcementState>;
  findByIdempotencyKey(enterpriseId: string, idempotencyKey: string): Promise<{ request: EnforcementRequest; result: EnforcementAdapterResult } | null>;
  reserveRequest(request: EnforcementRequest): Promise<
    | { created: true }
    | { created: false; blocked: true; reasonCodes: string[] }
    | { created: false; blocked?: false; request: EnforcementRequest; result: EnforcementAdapterResult }
  >;
  adapter: { execute(request: EnforcementRequest): Promise<EnforcementAdapterResult> };
  now?: () => string;
}) {
  exactUuid(input.enterpriseId, "enterpriseId");
  exactUuid(input.transactionId, "transactionId");
  exactUuid(input.authorityId, "authorityId");
  exactUuid(input.delegationId, "delegationId");
  exactString(input.operationalEntityId, "operationalEntityId");
  exactString(input.idempotencyKey, "idempotencyKey");
  if (!digestPattern.test(input.decisionDigest)) throw new NativeEnforcementError("The decision digest is invalid.", "DECISION_DIGEST_INVALID");
  const action = canonicalAuthorizedAction(input.action);
  const request: EnforcementRequest = {
    requestId: randomUUID(),
    enterpriseId: input.enterpriseId,
    transactionId: input.transactionId,
    operationalEntityId: input.operationalEntityId,
    authorityId: input.authorityId,
    delegationId: input.delegationId,
    action,
    actionDigest: deriveEnforcementActionDigest({ enterpriseId: input.enterpriseId, transactionId: input.transactionId, operationalEntityId: input.operationalEntityId, action }),
    decisionDigest: input.decisionDigest,
    idempotencyKey: input.idempotencyKey,
    requestedAt: (dependencies.now ?? (() => new Date().toISOString()))(),
  };
  if (input.decision !== "ALLOW") return { requested: false, request: null, result: null, eligibility: { eligible: false, state: "DENIED" as const, reasonCodes: [input.decision === "DENY" ? "DECISION_DENY_NO_ENFORCEMENT" : "DECISION_REVIEW_NO_ENFORCEMENT"], algorithmVersion: ENFORCEMENT_ELIGIBILITY_VERSION } };
  const existing = await dependencies.findByIdempotencyKey(input.enterpriseId, input.idempotencyKey);
  if (existing) return { requested: true, request: existing.request, result: existing.result, duplicate: true, eligibility: { eligible: true, state: "ELIGIBLE" as const, reasonCodes: ["IDEMPOTENT_REPLAY"], algorithmVersion: ENFORCEMENT_ELIGIBILITY_VERSION } };
  const current = await dependencies.loadCurrentState(request);
  const eligibility = evaluateEnforcementEligibility({ decision: input.decision, request, current, approval: input.approval });
  if (!eligibility.eligible) return { requested: false, request: null, result: null, eligibility };
  const reservation = await dependencies.reserveRequest(request);
  if (!reservation.created && reservation.blocked) return { requested: false, request: null, result: null, duplicate: false, eligibility: { ...eligibility, eligible: false, state: reservation.reasonCodes.includes("HUMAN_APPROVAL_REQUIRED") ? "REVIEW_REQUIRED" as const : "CANCELLED" as const, reasonCodes: reservation.reasonCodes } };
  if (!reservation.created) return { requested: true, request: reservation.request, result: reservation.result, duplicate: true, eligibility: { ...eligibility, reasonCodes: ["IDEMPOTENT_REPLAY"] } };
  const result = await dependencies.adapter.execute(request);
  return { requested: true, request, result, duplicate: false, eligibility };
}
