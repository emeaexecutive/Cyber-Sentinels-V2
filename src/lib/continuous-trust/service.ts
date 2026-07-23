import "server-only";

import { performance } from "node:perf_hooks";
import { createTrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import { signTrustEvent } from "../trust-events/hash.ts";
import { TRUST_EVENT_CANONICALIZATION, TRUST_EVENT_HASH_ALGORITHM, TRUST_EVENT_SCHEMA_VERSION, type TrustEventSubjectType } from "../trust-events/types.ts";
import { evaluateTrustState } from "../trust-state/engine.ts";
import { evaluateContinuousTrust } from "./engine.ts";
import { continuousTrustRepository } from "./repository.ts";

const subjectTypes = new Set<TrustEventSubjectType>(["HUMAN", "AI_AGENT", "SERVICE", "DEVICE", "WORKLOAD", "ORGANIZATION", "UNKNOWN"]);
function subjectType(value: string): TrustEventSubjectType { return subjectTypes.has(value as TrustEventSubjectType) ? value as TrustEventSubjectType : "UNKNOWN"; }

export async function recalculateContinuousTrust(input: { enterpriseId: string; subjectId: string; domainKey?: string; subjectType?: string; sourceEventId?: string | null; correlationId: string; evaluatedAt?: string }) {
  const started = performance.now();
  const repository = continuousTrustRepository();
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  try {
    const [previous, evidence, providerHealth, policy] = await Promise.all([repository.current(input.enterpriseId, input.subjectId), repository.evidence(input.enterpriseId, input.subjectId), repository.providerHealth(input.enterpriseId), repository.policy(input.enterpriseId, input.domainKey ?? "IDENTITY", evaluatedAt)]);
    const assessment = evaluateContinuousTrust({ enterpriseId: input.enterpriseId, domainKey: input.domainKey ?? evidence[0]?.domainKey ?? "IDENTITY", subjectId: input.subjectId, subjectType: input.subjectType ?? evidence[0]?.subjectType ?? "UNKNOWN", evaluatedAt, sourceEventId: input.sourceEventId ?? null, evidence, providerHealth, previous, policy });
    const duplicate = await repository.assessment(input.enterpriseId, assessment.assessmentId);
    if (duplicate) return { status: "DUPLICATE" as const, assessment, decision: null, persisted: duplicate };
    const contract = createTrustDecisionContract({ enterpriseId: input.enterpriseId, domainKey: assessment.domainKey, subjectId: input.subjectId, policyId: policy.policyId, policyVersion: policy.policyVersion, evidenceSnapshotHash: assessment.evidenceSnapshotHash, requestedAt: assessment.evaluatedAt, decisionInputs: { assessmentId: assessment.assessmentId, assessmentHash: assessment.assessmentHash, priorState: previous?.state ?? "UNKNOWN", score: assessment.score, confidence: assessment.confidence, transitionType: assessment.transitionType } });
    const decision = evaluateTrustState({ contract, priorState: previous?.state ?? "UNKNOWN", recommendation: assessment.recommendation, evidence, policy: { policyId: policy.policyId, policyVersion: policy.policyVersion, allowRecoveryFromBlocked: policy.allowRecoveryFromBlocked, minimumEvidenceForTrusted: policy.minimumEvidenceForTrusted, minimumEvidenceForVerified: policy.minimumEvidenceForVerified }, decidedAt: assessment.evaluatedAt, runtime: { score: assessment.score, evidenceFreshness: assessment.evidenceFreshness, nextEvaluationAt: assessment.nextEvaluationAt, riskFlags: assessment.riskFlags, sourceEventId: assessment.sourceEventId, decisionReasonSummary: assessment.reasonCodes.join(", "), transitionType: assessment.transitionType, assessmentId: assessment.assessmentId } });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const head = await repository.chainHead(input.enterpriseId);
      const event = signTrustEvent({ eventId: crypto.randomUUID(), enterpriseId: input.enterpriseId, schemaVersion: TRUST_EVENT_SCHEMA_VERSION, eventType: assessment.transitionType === "DEGRADED" ? "runtime.trust.degraded" : assessment.transitionType === "RESTORED" ? "runtime.trust.restored" : "runtime.trust.recalculated", subject: { type: subjectType(assessment.subjectType), id: input.subjectId }, actor: { type: "SYSTEM", id: "continuous-trust-runtime" }, workflow: null, session: null, authority: null, provider: { key: "cyber_sentinels_continuous_trust", protocol: "UNSIGNED", serverVerified: true, eventId: decision.stateDecisionId, transactionId: input.correlationId, deliveryId: null }, normalizedFacts: { assessmentId: assessment.assessmentId, priorState: decision.priorState, nextState: decision.nextState, score: assessment.score, confidence: assessment.confidence, evidenceFreshness: assessment.evidenceFreshness, transitionType: assessment.transitionType, policyVersion: assessment.policyVersion, sourceEventId: assessment.sourceEventId }, reasonCodes: decision.reasonCodes, evidenceReferences: assessment.evidenceReferences, occurredAt: assessment.evaluatedAt, receivedAt: assessment.evaluatedAt, sequence: head.sequence + 1, previousHash: head.eventHash, canonicalization: TRUST_EVENT_CANONICALIZATION, hashAlgorithm: TRUST_EVENT_HASH_ALGORITHM, ordering: { late: false, supersedesEventId: null, providerSequence: null } });
      const persisted = await repository.apply(contract, decision, event, { ...assessment, evaluationDurationMs: Math.max(0, Math.round(performance.now() - started)), staleEvidenceCount: evidence.filter((item) => item.expiresAt && Date.parse(item.expiresAt) <= Date.parse(evaluatedAt)).length }, input.correlationId);
      if (persisted.status === "CHAIN_CONFLICT") continue;
      if (persisted.status === "STATE_CONFLICT") throw Object.assign(new Error("Runtime trust changed during evaluation; retry with current state."), { status: 409, code: "TRUST_STATE_CHANGED" });
      return { status: persisted.status, assessment, contract, decision, persisted };
    }
    throw Object.assign(new Error("Continuous Trust event contention exceeded the retry limit."), { status: 503, code: "CONTINUOUS_TRUST_CONTENTION" });
  } catch (error) {
    const candidate = error as Error & { code?: string };
    console.error("Continuous Trust evaluation failed.", { eventType: "continuous_trust.evaluation_failed", timestamp: new Date().toISOString(), operation: "recalculate", errorCategory: candidate.code ?? "UNEXPECTED", subjectReferenceLength: input.subjectId.length, durationMs: Math.round(performance.now() - started) });
    throw error;
  }
}
