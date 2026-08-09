import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import {
  advanceTrustRecovery,
  createTrustChangeEvent,
  createTrustRecovery,
  deriveTrustConfidence,
  deriveTrustHealth,
  evaluateTrustDrift,
  evaluateTrustStability,
  explainOperationalTrust,
  predictOperationalTrust,
  recommendTrustAction,
  type GroundedNarrativeSentence,
  type TrustChangeEvent,
  type TrustChangeType,
  type TrustConditionState,
  type TrustDriftAssessment,
  type TrustHealthAssessment,
  type TrustHealthDimension,
  type TrustHealthDimensionState,
  type TrustRecoveryRecord,
} from "../trust-intelligence.ts";
import type { OperationalEntityLiveDetail } from "./server.ts";

type Row = Record<string, unknown>;

export type OperationalEntityIntelligenceProjection = {
  generatedAt: string;
  source: "PERSISTED_TENANT_RECORDS" | "INSUFFICIENT_EVIDENCE";
  health: TrustHealthAssessment;
  drift: TrustDriftAssessment;
  confidence: ReturnType<typeof deriveTrustConfidence>;
  stability: ReturnType<typeof evaluateTrustStability>;
  prediction: ReturnType<typeof predictOperationalTrust>;
  recovery: TrustRecoveryRecord | null;
  recommendation: ReturnType<typeof recommendTrustAction>;
  narrative: GroundedNarrativeSentence[];
  explanation: ReturnType<typeof explainOperationalTrust>;
  evidenceIndex: Array<{ reference: string; label: string; href: string }>;
};

function text(value: unknown, fallback = "UNKNOWN") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function evidenceRows(transaction: Row) {
  return Array.isArray(transaction.evidence_references)
    ? transaction.evidence_references.filter((item): item is Row => Boolean(item && typeof item === "object"))
    : [];
}

function transactionReference(transaction: Row) {
  return `transaction:${text(transaction.transaction_id, "not-recorded")}`;
}

function snapshotConditionState(detail: OperationalEntityLiveDetail, transaction: Row): TrustConditionState {
  const snapshot = object(transaction.decision_time_snapshot);
  const enforcement = object(snapshot.enforcementState);
  const evidence = evidenceRows(transaction);
  const transactionRef = transactionReference(transaction);
  const evidenceReferences = evidence.map((item) => text(item.reference, "")).filter(Boolean);
  const authorityReference = text(transaction.authority_reference);
  const externalIdentityReferences = Array.isArray(snapshot.externalIdentityReferences)
    ? snapshot.externalIdentityReferences.map((item) => text(object(item).referenceId, "")).filter(Boolean)
    : detail.externalIdentities.map((item) => item.referenceId);
  const providerReferences = evidence.map((item) => text(item.providerId, "")).filter(Boolean);
  const activeIncidentReferences = Array.isArray(snapshot.activeIncidentReferences)
    ? snapshot.activeIncidentReferences.map(String)
    : [];
  const snapshotRecordsIncidentState = Object.hasOwn(snapshot, "activeIncidentReferences");
  const allEvidence = [...new Set([...evidenceReferences, transactionRef])];
  return {
    stateReference: transactionRef,
    identity: externalIdentityReferences.sort().join("|") || "UNKNOWN",
    accountableOwner: text(snapshot.accountableHuman ?? detail.entity.accountableOwnerId),
    authority: authorityReference,
    toolScope: [text(transaction.action_type)],
    targetScope: [text(transaction.action_resource)],
    environment: text(transaction.action_environment),
    runtime: text(enforcement.runtimeObservation),
    provider: providerReferences.sort().join("|") || "NOT_CONFIGURED",
    evidenceFreshness: transaction.evidence_fresh === true ? "CURRENT" : transaction.evidence_fresh === false ? "STALE" : "UNKNOWN",
    evidenceIndependence: text(transaction.evidence_independence),
    behaviour: `DECISION_${text(transaction.decision)}`,
    outcome: text(transaction.external_state, "NOT_RECORDED"),
    incidentState: activeIncidentReferences.length
      ? activeIncidentReferences.sort().join("|")
      : snapshotRecordsIncidentState ? "NONE_RECORDED_AT_DECISION_TIME" : "UNKNOWN",
    evidenceByCondition: {
      identity: externalIdentityReferences.length ? externalIdentityReferences : allEvidence,
      accountableOwner: [transactionRef],
      authority: [authorityReference, ...strings(transaction.authority_lineage_references)].filter(Boolean),
      toolScope: [transactionRef],
      targetScope: [transactionRef],
      environment: [transactionRef],
      runtime: enforcement.runtimeObservation ? [transactionRef] : [],
      provider: evidenceReferences,
      evidenceFreshness: evidenceReferences,
      evidenceIndependence: evidenceReferences,
      behaviour: [transactionRef],
      outcome: transaction.external_state ? [transactionRef] : [],
      incidentState: snapshotRecordsIncidentState ? [transactionRef, ...activeIncidentReferences] : [],
    },
  };
}

function unavailableDrift(generatedAt: string): TrustDriftAssessment {
  const unsigned = {
    state: "INSUFFICIENT_EVIDENCE" as const,
    findings: [],
    evidenceReferences: [],
    reasonCodes: ["FEWER_THAN_TWO_DECISION_TIME_SNAPSHOTS"],
    evaluatedAt: generatedAt,
  };
  return { ...unsigned, digest: hashCanonical(unsigned) };
}

function healthDimension(state: TrustHealthDimensionState, reasonCodes: string[], evidenceReferences: string[]) {
  return { state, reasonCodes, evidenceReferences: [...new Set(evidenceReferences)].filter(Boolean).sort() };
}

function healthFromDetail(detail: OperationalEntityLiveDetail, latest: Row | null): TrustHealthAssessment {
  const transactionRef = latest ? transactionReference(latest) : "";
  const evidence = latest ? evidenceRows(latest) : [];
  const evidenceRefs = evidence.map((item) => text(item.reference, "")).filter(Boolean);
  const snapshot = object(latest?.decision_time_snapshot);
  const enforcement = object(snapshot.enforcementState);
  const independence = text(latest?.evidence_independence);
  const dimensions = {} as TrustHealthAssessment["dimensions"];
  dimensions.IDENTITY = detail.externalIdentities.length
    ? healthDimension("SUPPORTED", ["IDENTITY_EVIDENCE_RECORDED"], detail.externalIdentities.map((item) => item.referenceId))
    : healthDimension("UNKNOWN", ["IDENTITY_EVIDENCE_NOT_RECORDED"], []);
  dimensions.ACCOUNTABILITY = detail.entity.accountableOwnerId && detail.entity.accountableOwnerId !== "legacy_unresolved"
    ? healthDimension("SUPPORTED", ["ACCOUNTABLE_OWNER_RECORDED"], [transactionRef || detail.entity.canonicalDigest])
    : healthDimension("UNKNOWN", ["ACCOUNTABLE_OWNER_NOT_RECORDED"], []);
  dimensions.AUTHORITY = latest?.authority_reference
    ? healthDimension(strings(latest.reason_codes).some((reason) => /AUTHORITY_(REVOKED|SCOPE_INVALID)/.test(reason)) ? "CONFLICTING" : "SUPPORTED", strings(latest.reason_codes).filter((reason) => reason.startsWith("AUTHORITY_")), [text(latest.authority_reference), transactionRef])
    : healthDimension("UNKNOWN", ["AUTHORITY_NOT_RECORDED"], []);
  dimensions.EVIDENCE = !latest
    ? healthDimension("UNKNOWN", ["CANONICAL_DECISION_NOT_RECORDED"], [])
    : latest.evidence_complete === true && latest.evidence_fresh === true
      ? healthDimension("SUPPORTED", ["EVIDENCE_SUFFICIENT", "EVIDENCE_CURRENT"], evidenceRefs)
      : evidence.length
        ? healthDimension(latest.evidence_complete === true || latest.evidence_fresh === true ? "PARTIAL" : "DEGRADED", strings(latest.reason_codes), evidenceRefs)
        : healthDimension("UNKNOWN", ["EVIDENCE_NOT_RECORDED"], []);
  dimensions.CONTINUITY = enforcement.runtimeObservation === "enforced" && enforcement.destinationObservation === "enforced"
    ? healthDimension("SUPPORTED", ["RUNTIME_AND_DESTINATION_OBSERVED"], [transactionRef])
    : enforcement.runtimeObservation === "not_enforced" || enforcement.destinationObservation === "not_enforced"
      ? healthDimension("CONFLICTING", ["RUNTIME_OR_DESTINATION_CONTRADICTED"], [transactionRef])
      : healthDimension("UNKNOWN", ["RUNTIME_CONTINUITY_NOT_OBSERVED"], []);
  dimensions.OUTCOME = latest?.external_state === "SUCCEEDED"
    ? healthDimension("SUPPORTED", ["EXTERNAL_OUTCOME_SUCCEEDED"], [transactionRef])
    : latest?.external_state === "FAILED"
      ? healthDimension("DEGRADED", ["EXTERNAL_OUTCOME_FAILED"], [transactionRef])
      : healthDimension("UNKNOWN", ["DESTINATION_OUTCOME_NOT_CONFIRMED"], []);
  dimensions.INCIDENT = Array.isArray(snapshot.activeIncidentReferences)
    ? snapshot.activeIncidentReferences.length
      ? healthDimension("DEGRADED", ["ACTIVE_INCIDENT_RECORDED"], snapshot.activeIncidentReferences.map(String))
      : healthDimension("SUPPORTED", ["NO_ACTIVE_INCIDENT_AT_DECISION_TIME"], [transactionRef])
    : healthDimension("UNKNOWN", ["INCIDENT_STATE_NOT_RECORDED"], []);
  dimensions.PROVIDER_INDEPENDENCE = ["multi_source", "independently_confirmed"].includes(independence)
    ? healthDimension("SUPPORTED", ["PROVIDER_EVIDENCE_INDEPENDENT"], evidenceRefs)
    : independence === "conflicting"
      ? healthDimension("CONFLICTING", ["PROVIDER_CONFLICT"], evidenceRefs)
      : ["single_source", "same_party_multi_system", "provider_and_operator_same_party"].includes(independence)
        ? healthDimension("PARTIAL", ["PROVIDER_EVIDENCE_NOT_INDEPENDENT"], evidenceRefs)
        : healthDimension("UNKNOWN", ["PROVIDER_INDEPENDENCE_NOT_ESTABLISHED"], []);
  return deriveTrustHealth(dimensions as Record<TrustHealthDimension, TrustHealthAssessment["dimensions"][TrustHealthDimension]>);
}

function changeType(transaction: Row): TrustChangeType {
  const changes = strings(transaction.changed_conditions);
  if (changes.includes("AUTHORITY_CHANGED")) return "AUTHORITY_CHANGED";
  if (changes.includes("POLICY_CHANGED")) return "POLICY_CHANGED";
  if (changes.includes("EVIDENCE_CHANGED")) return "EVIDENCE_CHANGED";
  return text(transaction.decision) === "ALLOW" ? "OUTCOME_CONFIRMED" : "INCIDENT_OPENED";
}

function historyEvents(detail: OperationalEntityLiveDetail): TrustChangeEvent[] {
  return detail.transactions.map((transaction) => {
    const refs = evidenceRows(transaction).map((item) => text(item.reference, "")).filter(Boolean);
    const effectiveAt = text(transaction.requested_at, detail.entity.updatedAt);
    return createTrustChangeEvent({
      enterpriseId: detail.entity.enterpriseId,
      operationalEntityId: detail.entity.entityId,
      transactionId: text(transaction.transaction_id),
      changeType: changeType(transaction),
      previousStateReference: transaction.previous_transaction_id ? `transaction:${transaction.previous_transaction_id}` : "NONE",
      currentStateReference: transactionReference(transaction),
      evidenceReferences: refs.length ? refs : [transactionReference(transaction)],
      authorityReferences: transaction.authority_reference ? [text(transaction.authority_reference)] : [],
      providerReferences: evidenceRows(transaction).map((item) => text(item.providerId, "")).filter(Boolean),
      incidentReferences: strings(object(transaction.decision_time_snapshot).activeIncidentReferences),
      detectedAt: effectiveAt,
      effectiveAt,
      materiality: transaction.material_change === true ? (text(transaction.decision) === "DENY" ? "HIGH" : "MODERATE") : "IMMATERIAL",
      confidence: (object(transaction.decision_time_snapshot).confidenceInConclusion ?? "INSUFFICIENT") as TrustChangeEvent["confidence"],
      reasonCodes: strings(transaction.reason_codes),
      recommendedEvaluation: text(transaction.decision) === "ALLOW" ? "CONTINUE" : text(transaction.decision) === "DENY" ? "SUSPEND" : "REVIEW",
    });
  });
}

function deriveRecovery(detail: OperationalEntityLiveDetail): TrustRecoveryRecord | null {
  if (!detail.transactions.length) return null;
  const latest = detail.transactions.at(-1)!;
  const adverse = [...detail.transactions].reverse().find((transaction) => ["REVIEW", "DENY"].includes(text(transaction.decision)));
  if (!adverse) return null;
  const createdAt = text(adverse.requested_at, detail.entity.updatedAt);
  const adverseRefs = evidenceRows(adverse).map((item) => text(item.reference, "")).filter(Boolean);
  let recovery = createTrustRecovery({
    recoveryId: `recovery:${detail.entity.entityId}:${text(adverse.transaction_id)}`,
    enterpriseId: detail.entity.enterpriseId,
    operationalEntityId: detail.entity.entityId,
    requirements: strings(adverse.reason_codes),
    evidenceReferences: [],
    adverseEvidenceReferences: adverseRefs.length ? adverseRefs : [transactionReference(adverse)],
    createdAt,
  });
  recovery = advanceTrustRecovery(recovery, "REMEDIATION_REQUIRED", createdAt);
  if (text(latest.decision) !== "ALLOW" || latest.evidence_digest === adverse.evidence_digest) return recovery;
  const recoveryRefs = evidenceRows(latest).map((item) => text(item.reference, "")).filter(Boolean);
  if (!recoveryRefs.length) return recovery;
  const restoredAt = text(latest.requested_at, detail.entity.updatedAt);
  recovery = advanceTrustRecovery(recovery, "EVIDENCE_RECEIVED", restoredAt, recoveryRefs);
  recovery = advanceTrustRecovery(recovery, "RE_EVALUATION", restoredAt);
  return advanceTrustRecovery(recovery, "RESTORED", restoredAt, [transactionReference(latest)]);
}

function evidenceIndex(detail: OperationalEntityLiveDetail) {
  const entries: Array<{ reference: string; label: string; href: string }> = [];
  for (const identity of detail.externalIdentities) entries.push({ reference: identity.referenceId, label: `${identity.provider} identity evidence`, href: `/operational-entities/${encodeURIComponent(detail.entity.entityId)}#external-identities` });
  for (const transaction of detail.transactions) {
    const transactionId = text(transaction.transaction_id);
    entries.push({ reference: transactionReference(transaction), label: `Canonical ${text(transaction.decision)} decision`, href: `/trust/transactions/${encodeURIComponent(transactionId)}` });
    for (const item of evidenceRows(transaction)) {
      const reference = text(item.reference, "");
      if (reference) entries.push({ reference, label: `${text(item.providerId)} provider evidence`, href: `/trust/transactions/${encodeURIComponent(transactionId)}#provider-evidence` });
    }
  }
  return [...new Map(entries.map((entry) => [entry.reference, entry])).values()];
}

export function projectOperationalEntityIntelligence(detail: OperationalEntityLiveDetail, generatedAt = new Date().toISOString()): OperationalEntityIntelligenceProjection {
  const transactions = detail.transactions;
  const latest = transactions.at(-1) ?? null;
  const current = latest ? snapshotConditionState(detail, latest) : null;
  const previous = transactions.length > 1 ? snapshotConditionState(detail, transactions.at(-2)!) : null;
  const drift = current && previous ? evaluateTrustDrift({ previous, current, evaluatedAt: generatedAt }) : unavailableDrift(generatedAt);
  const health = healthFromDetail(detail, latest);
  const evidence = latest ? evidenceRows(latest) : [];
  const independence = text(latest?.evidence_independence);
  const snapshot = object(latest?.decision_time_snapshot);
  const enforcement = object(snapshot.enforcementState);
  const confidence = deriveTrustConfidence({
    evidenceCompleteness: latest?.evidence_complete === true ? 1 : evidence.length ? 0.35 : 0,
    evidenceFreshness: latest?.evidence_fresh === true ? 1 : latest?.evidence_fresh === false ? 0.2 : 0,
    sourceIndependence: independence === "independently_confirmed" ? 1 : independence === "multi_source" ? 0.85 : evidence.length ? 0.4 : 0,
    providerAgreement: independence === "conflicting" ? 0 : 1,
    authorityCertainty: latest?.authority_reference ? 1 : 0,
    outcomeConfirmation: latest?.external_state === "SUCCEEDED" ? 1 : latest?.external_state === "FAILED" ? 0 : 0.25,
    continuity: enforcement.runtimeObservation === "enforced" && enforcement.destinationObservation === "enforced" ? 1 : enforcement.runtimeObservation ? 0.4 : 0,
    unresolvedContradictions: strings(snapshot.contradictions).length,
    evidenceReferences: evidence.map((item) => text(item.reference, "")).filter(Boolean),
  });
  const changes = historyEvents(detail);
  const stability = evaluateTrustStability({ events: changes, asOf: generatedAt, windowsHours: [24, 168, 720] });
  const expiries = evidence.map((item) => text(item.expiresAt, "")).filter((value) => Number.isFinite(Date.parse(value))).sort();
  const prediction = predictOperationalTrust({
    generatedAt,
    horizonHours: 24,
    evidenceExpiresAt: expiries[0] ?? null,
    authorityExpiresAt: null,
    providerGap: !evidence.length || independence === "insufficient",
    unresolvedMaterialDrift: ["MATERIAL_DRIFT", "CRITICAL_DRIFT", "UNEXPLAINED_DRIFT"].includes(drift.state),
    policyEscalationExpected: text(latest?.decision) === "REVIEW",
    supportingEvidence: latest ? [...new Set([...health.evidenceReferences, ...drift.evidenceReferences])] : [],
    historicalBasis: transactions.slice(0, -1).map(transactionReference),
  });
  const recommendation = recommendTrustAction({ drift, health });
  const latestReference = latest ? transactionReference(latest) : detail.entity.canonicalDigest;
  const narrative: GroundedNarrativeSentence[] = latest
    ? [
        { text: `${detail.entity.displayReference} has a persisted canonical ${text(latest.decision)} decision.`, evidenceReferences: [latestReference] },
        { text: `Evidence is ${latest.evidence_complete === true ? "sufficient" : "insufficient"} and ${latest.evidence_fresh === true ? "current" : "stale or unavailable"} for that decision.`, evidenceReferences: evidence.map((item) => text(item.reference, "")).filter(Boolean).length ? evidence.map((item) => text(item.reference, "")).filter(Boolean) : [latestReference] },
      ]
    : [{ text: `${detail.entity.displayReference} has no persisted canonical decision.`, evidenceReferences: [detail.entity.canonicalDigest] }];
  const recovery = deriveRecovery(detail);
  const explanation = explainOperationalTrust({
    narrative,
    drift,
    health,
    unknowns: health.reasonCodes.filter((reason) => /UNKNOWN|NOT_RECORDED|NOT_CONFIRMED|NOT_OBSERVED/.test(reason)),
    actionTaken: latest ? (text(latest.decision) === "ALLOW" ? `Execution state: ${text(latest.external_state, "NOT_RECORDED")}.` : "No execution is permitted by the latest decision.") : "No action is recorded.",
    restorationRequirements: recommendation.recommendation === "NO_ACTION_REQUIRED" ? [] : [recommendation.recommendation],
  });
  return {
    generatedAt,
    source: latest ? "PERSISTED_TENANT_RECORDS" : "INSUFFICIENT_EVIDENCE",
    health,
    drift,
    confidence,
    stability,
    prediction,
    recovery,
    recommendation,
    narrative,
    explanation,
    evidenceIndex: evidenceIndex(detail),
  };
}
