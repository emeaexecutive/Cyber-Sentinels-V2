import { healthMultiplier } from "../consensus/health.ts";
import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { normalizeReasonCodes } from "../trust-core/reason-codes.ts";
import { normalizeUtcTimestamp } from "../trust-core/time.ts";
import { validateEvidenceObject, type AssuranceLevel, type EvidenceObject } from "../trust-architecture/evidence.ts";
import type { TrustState } from "../trust-state/types.ts";
import type {
  ContinuousTrustAssessment,
  ContinuousTrustInput,
  DriftFinding,
  DriftSeverity,
  EvidenceFreshness,
  RuntimeAlertDecision,
  TransitionType,
} from "./types.ts";

const assuranceWeight: Record<AssuranceLevel, number> = { NONE: 0, LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, VERY_HIGH: 1 };
const stateRank: Record<TrustState, number> = { REVOKED: 0, BLOCKED: 1, EXPIRED: 2, CHALLENGED: 3, INCONCLUSIVE: 4, UNKNOWN: 5, OBSERVED: 6, TRUSTED: 7, VERIFIED: 8 };
const severityRank: Record<DriftSeverity, number> = { informational: 0, low: 1, medium: 2, high: 3, critical: 4 };

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }
function unique(values: string[]) { return [...new Set(values)].sort(); }
function evidenceReference(item: EvidenceObject) { return `evidence:${item.evidenceId}`; }

function freshness(input: ContinuousTrustInput, evidence: EvidenceObject[]) {
  const now = Date.parse(input.evaluatedAt);
  const current: EvidenceObject[] = [];
  const stale: EvidenceObject[] = [];
  const expired: EvidenceObject[] = [];
  let nextExpiry = now + input.policy.evaluationIntervalSeconds * 1000;
  for (const item of evidence) {
    const explicitExpiry = item.expiresAt ? Date.parse(item.expiresAt) : null;
    const windowSeconds = input.policy.freshnessByEvidenceType[item.evidenceType] ?? input.policy.defaultFreshnessSeconds;
    const policyExpiry = Date.parse(item.occurredAt) + windowSeconds * 1000;
    const effectiveExpiry = explicitExpiry === null ? policyExpiry : Math.min(explicitExpiry, policyExpiry);
    nextExpiry = Math.min(nextExpiry, effectiveExpiry);
    if (item.result === "REVOKED" || effectiveExpiry <= now) expired.push(item);
    else if (effectiveExpiry - now <= Math.max(60_000, windowSeconds * 250)) stale.push(item);
    else current.push(item);
  }
  const status: EvidenceFreshness = evidence.length === 0 ? "UNAVAILABLE" : current.length === 0 ? "EXPIRED" : stale.length > 0 ? "DEGRADED" : "CURRENT";
  return { current, stale, expired, status, nextEvaluationAt: new Date(Math.max(now, nextExpiry)).toISOString() };
}

function drift(input: ContinuousTrustInput, score: number, confidence: number, currentFreshness: EvidenceFreshness, evidence: EvidenceObject[], riskFlags: string[]): DriftFinding[] {
  const findings: Array<Omit<DriftFinding, "driftId">> = [];
  const add = (finding: Omit<DriftFinding, "driftId">) => findings.push(finding);
  const refs = evidence.map(evidenceReference);
  if (input.previous?.score !== null && input.previous?.score !== undefined && input.previous.score - score >= input.policy.scoreDriftThreshold) add({ driftType: "score_deterioration", severity: input.previous.score - score >= 25 ? "high" : "medium", ruleId: "CTR-SCORE-001", reasonCode: "TRUST_SCORE_DETERIORATED", evidenceReferences: refs, priorValue: input.previous.score, currentValue: score, detectedAt: input.evaluatedAt });
  if (input.previous && input.previous.confidence - confidence >= input.policy.confidenceDriftThreshold) add({ driftType: "confidence_deterioration", severity: "medium", ruleId: "CTR-CONFIDENCE-001", reasonCode: "TRUST_CONFIDENCE_DETERIORATED", evidenceReferences: refs, priorValue: input.previous.confidence, currentValue: confidence, detectedAt: input.evaluatedAt });
  if (["DEGRADED", "STALE", "EXPIRED"].includes(currentFreshness) && currentFreshness !== input.previous?.evidenceFreshness) add({ driftType: "evidence_freshness", severity: currentFreshness === "EXPIRED" ? "high" : "medium", ruleId: "CTR-FRESHNESS-001", reasonCode: `EVIDENCE_${currentFreshness}`, evidenceReferences: refs, priorValue: input.previous?.evidenceFreshness ?? null, currentValue: currentFreshness, detectedAt: input.evaluatedAt });
  if (input.previous?.policyVersion && input.previous.policyVersion !== input.policy.policyVersion) add({ driftType: "policy_mismatch", severity: "low", ruleId: "CTR-POLICY-001", reasonCode: "POLICY_VERSION_CHANGED", evidenceReferences: [], priorValue: input.previous.policyVersion, currentValue: input.policy.policyVersion, detectedAt: input.evaluatedAt });
  const ruleByFlag: Record<string, [string, DriftSeverity, string]> = {
    PROVIDER_DISAGREEMENT: ["CTR-PROVIDER-001", "high", "provider_disagreement"],
    PROVIDER_OUTAGE_IMPACT: ["CTR-PROVIDER-002", "medium", "provider_outage"],
    REPEATED_VERIFICATION_FAILURE: ["CTR-VERIFY-001", "high", "repeated_verification_failure"],
    DEVICE_CHANGE: ["CTR-DEVICE-001", "medium", "device_change"],
    LOCATION_ANOMALY: ["CTR-LOCATION-001", "high", "lawful_location_anomaly"],
    AUTHORITY_CHANGE: ["CTR-AUTHORITY-001", "high", "unexpected_authority_change"],
    IDENTITY_SIGNAL_INCONSISTENCY: ["CTR-IDENTITY-001", "high", "identity_signal_inconsistency"],
  };
  for (const flag of riskFlags) { const rule = ruleByFlag[flag]; if (rule) add({ driftType: rule[2], severity: rule[1], ruleId: rule[0], reasonCode: flag, evidenceReferences: refs, priorValue: null, currentValue: flag, detectedAt: input.evaluatedAt }); }
  return findings.map((finding) => ({ ...finding, driftId: deterministicUuid({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, ...finding } as unknown as Record<string, unknown>) })).sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.driftId.localeCompare(b.driftId));
}

function alertDecisions(input: ContinuousTrustInput, findings: DriftFinding[]): RuntimeAlertDecision[] {
  return findings.filter((finding) => severityRank[finding.severity] >= severityRank.medium).map((finding) => {
    const remediation = finding.driftType.includes("provider") ? "Review provider health and independent evidence before relying on the affected signal." : finding.driftType.includes("evidence") ? "Refresh or reverify the expired evidence through an approved provider." : "Review the referenced evidence and current policy before restoring access.";
    return { alertId: deterministicUuid({ enterpriseId: input.enterpriseId, driftId: finding.driftId, alertType: `continuous_${finding.driftType}` }), alertType: `continuous_${finding.driftType}`, severity: finding.severity, state: "open" as const, driftId: finding.driftId, evidenceReferences: finding.evidenceReferences, remediationGuidance: remediation };
  });
}

function transitionType(previous: ContinuousTrustInput["previous"], next: TrustState): TransitionType {
  if (!previous) return "INITIAL";
  if (previous.state === next) return "UNCHANGED";
  return stateRank[next] < stateRank[previous.state] ? "DEGRADED" : stateRank[next] > stateRank[previous.state] ? "RESTORED" : "RECALCULATED";
}

export function evaluateContinuousTrust(raw: ContinuousTrustInput): ContinuousTrustAssessment {
  const evaluatedAt = normalizeUtcTimestamp(raw.evaluatedAt, "evaluatedAt");
  const input = { ...raw, evaluatedAt };
  const evidence = raw.evidence.map(validateEvidenceObject).filter((item) => item.enterpriseId === input.enterpriseId && item.subjectId === input.subjectId);
  const fresh = freshness(input, evidence);
  const health = new Map(input.providerHealth.map((item) => [item.providerKey.toLowerCase(), item]));
  const positive = fresh.current.filter((item) => item.result === "POSITIVE");
  const negative = fresh.current.filter((item) => item.result === "NEGATIVE");
  const revoked = evidence.filter((item) => item.result === "REVOKED");
  const unavailableProviders = input.providerHealth.filter((item) => healthMultiplier(item.state) === 0);
  const positiveValue = positive.reduce((sum, item) => sum + assuranceWeight[item.assuranceLevel] * 55 * healthMultiplier(health.get(item.sourceKey.toLowerCase())?.state ?? "UNKNOWN"), 0);
  const negativeValue = negative.reduce((sum, item) => sum + Math.max(20, assuranceWeight[item.assuranceLevel] * 60), 0);
  const providerPenalty = unavailableProviders.length ? Math.min(20, unavailableProviders.length * 5) : 0;
  const score = revoked.length ? 0 : clamp(25 + positiveValue - negativeValue - providerPenalty);
  const averageAssurance = fresh.current.length ? fresh.current.reduce((sum, item) => sum + assuranceWeight[item.assuranceLevel], 0) / fresh.current.length : 0;
  const healthAverage = input.providerHealth.length ? input.providerHealth.reduce((sum, item) => sum + healthMultiplier(item.state), 0) / input.providerHealth.length : 0.5;
  const confidence = clamp((averageAssurance * 70) + (healthAverage * 30) - (fresh.stale.length * 10));
  const reasons: string[] = [];
  const riskFlags: string[] = [];
  if (positive.length && negative.length) riskFlags.push("PROVIDER_DISAGREEMENT", "IDENTITY_SIGNAL_INCONSISTENCY");
  if (unavailableProviders.length) riskFlags.push("PROVIDER_OUTAGE_IMPACT");
  if (negative.filter((item) => /verif/i.test(item.evidenceType)).length >= 2) riskFlags.push("REPEATED_VERIFICATION_FAILURE");
  const signalText = evidence.flatMap((item) => [item.evidenceType, ...item.reasonCodes]).join(" ").toLowerCase();
  if (/device.*(change|mismatch)/.test(signalText)) riskFlags.push("DEVICE_CHANGE");
  if (/(location|country).*(anomaly|mismatch|impossible)/.test(signalText)) riskFlags.push("LOCATION_ANOMALY");
  if (/authority.*(change|unexpected|revoked)/.test(signalText)) riskFlags.push("AUTHORITY_CHANGE");
  if (fresh.status !== "CURRENT") reasons.push(`EVIDENCE_${fresh.status}`);
  reasons.push(...riskFlags, ...unavailableProviders.flatMap((item) => item.reasonCodes));
  let recommendedState: TrustState = "INCONCLUSIVE";
  if (revoked.length) recommendedState = "REVOKED";
  else if (evidence.length > 0 && fresh.current.length === 0) recommendedState = "EXPIRED";
  else if (score <= input.policy.blockedScore || riskFlags.includes("REPEATED_VERIFICATION_FAILURE")) recommendedState = "BLOCKED";
  else if (score >= input.policy.verifiedScore && positive.length >= input.policy.minimumEvidenceForVerified) recommendedState = "VERIFIED";
  else if (score >= input.policy.trustedScore && positive.length >= input.policy.minimumEvidenceForTrusted) recommendedState = "TRUSTED";
  else if (score >= input.policy.challengedScore || negative.length > 0) recommendedState = "CHALLENGED";
  const evidenceReferences = evidence.map(evidenceReference).sort();
  const evidenceSnapshotHash = hashCanonical(evidence.map((item) => ({ evidenceId: item.evidenceId, result: item.result, assuranceLevel: item.assuranceLevel, sourceKey: item.sourceKey, occurredAt: item.occurredAt, expiresAt: item.expiresAt ?? null, payloadHash: item.payloadHash })).sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)));
  const recommendationId = deterministicUuid({ enterpriseId: input.enterpriseId, subjectId: input.subjectId, evaluatedAt, policyVersion: input.policy.policyVersion, evidenceSnapshotHash, score, confidence, recommendedState });
  const findings = drift(input, score, confidence, fresh.status, evidence, unique(riskFlags));
  const alerts = alertDecisions(input, findings);
  const unsigned = { enterpriseId: input.enterpriseId, domainKey: input.domainKey, subjectId: input.subjectId, subjectType: input.subjectType, evaluatedAt, nextEvaluationAt: fresh.nextEvaluationAt, score, confidence, evidenceFreshness: fresh.status, riskFlags: unique(riskFlags), reasonCodes: normalizeReasonCodes(reasons.length ? reasons : ["CONTINUOUS_TRUST_EVALUATED"]), transitionType: transitionType(input.previous, recommendedState), policyId: input.policy.policyId, policyVersion: input.policy.policyVersion, sourceEventId: input.sourceEventId ?? null, evidenceSnapshotHash, evidenceReferences, recommendation: { recommendationId, recommendedState, confidence, reasonCodes: normalizeReasonCodes(reasons), evidenceSnapshotHash }, drift: findings, alerts };
  const assessmentId = deterministicUuid(unsigned as unknown as Record<string, unknown>);
  return { ...unsigned, assessmentId, assessmentHash: hashCanonical({ ...unsigned, assessmentId } as unknown as Record<string, unknown>) };
}
