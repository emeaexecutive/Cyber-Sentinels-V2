import { deterministicUuid, hashCanonical } from "../trust-core/hash.ts";
import { enterpriseTrustPatternTypes, type CanonicalLearningEvent, type ConfidenceClassification, type EnterpriseTrustPattern, type EnterpriseTrustPatternType, type EvidenceStrength, type PatternMateriality } from "./types.ts";

const directPatterns = new Map<string, EnterpriseTrustPatternType>(enterpriseTrustPatternTypes.map((value) => [value, value]));
const eventAliases: Record<string, EnterpriseTrustPatternType> = {
  "authority.expired": "repeated_authority_expiry",
  "authority.scope_exceeded": "repeated_scope_excess",
  "authority.delegation_depth_exceeded": "repeated_delegation_depth_issue",
  "authority.action_limit_exhausted": "repeated_action_limit_exhaustion",
  "authority.reissued_after_failure": "authority_reissued_after_same_failure",
  "authority.child_activity_after_revocation": "child_activity_after_parent_revocation",
  "provider.unavailable": "recurring_provider_unavailability",
  "provider.contradiction": "recurring_provider_contradiction",
  "provider.corrected": "recurring_provider_correction",
  "provider.unsupported_confirmation": "provider_confirmation_not_independently_supported",
  "provider.latency_review": "provider_latency_affecting_review",
  "evidence.stale": "recurring_evidence_staleness",
  "evidence.mandatory_missing": "repeated_missing_mandatory_evidence",
  "evidence.integrity_failed": "recurring_integrity_failure",
  "evidence.identity_runtime_conflict": "repeated_identity_or_runtime_conflict",
  "evidence.attribution_disputed": "recurring_attribution_dispute",
  "workflow.review": "repeated_human_review",
  "workflow.denied": "repeated_denial",
  "workflow.relay_cancelled": "repeated_relay_cancellation",
  "workflow.environment_mismatch": "repeated_environment_mismatch",
  "workflow.corrective_action": "repeated_corrective_action",
  "incident.recurring": "recurring_incident_pattern",
  "outcome.unconfirmed": "actions_without_confirmed_outcome",
  "workflow.failed": "repeated_failed_workflow",
  "restoration.succeeded": "repeated_restoration_success",
  "restoration.failed": "repeated_restoration_failure",
  "cost.outcome_unconfirmed": "repeated_cost_without_confirmed_outcome",
  "consumption.after_revocation": "repeated_consumption_after_revocation",
};

const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
const validDate = (value: string) => Number.isFinite(Date.parse(value));
const materialityRank: Record<PatternMateriality, number> = { low: 1, moderate: 2, high: 3, critical: 4 };

function normalize(event: CanonicalLearningEvent): CanonicalLearningEvent | null {
  const patternType = directPatterns.get(event.eventType) ?? eventAliases[event.eventType];
  if (!patternType || !event.eventId || !event.enterpriseId || !event.subjectReference || !validDate(event.occurredAt) || event.materiality === "none") return null;
  return {
    ...event,
    eventType: patternType,
    evidenceReferences: unique(event.evidenceReferences),
    materiality: event.materiality ?? "moderate",
  };
}

function groupKey(event: CanonicalLearningEvent) {
  return [event.enterpriseId, event.eventType, event.subjectReference, event.workflowReference ?? "", event.providerReference ?? ""].join("|");
}

function evidenceStrength(events: CanonicalLearningEvent[]): EvidenceStrength {
  const evidenceCount = unique(events.flatMap((event) => event.evidenceReferences)).length;
  if (evidenceCount >= events.length && events.length >= 3) return "strong";
  if (evidenceCount >= Math.ceil(events.length / 2)) return "partial";
  return "weak";
}

function confidence(events: CanonicalLearningEvent[], strength: EvidenceStrength): ConfidenceClassification {
  if (events.length >= 4 && strength === "strong") return "high";
  if (events.length >= 3 && strength !== "weak") return "medium";
  return "low";
}

export class EnterpriseTrustPatternEngine {
  detect(input: { enterpriseId: string; events: CanonicalLearningEvent[]; minimumOccurrences?: number; recurrenceWindowDays?: number }): EnterpriseTrustPattern[] {
    const minimum = Math.max(2, input.minimumOccurrences ?? 2);
    const windowDays = Math.max(1, Math.min(3650, input.recurrenceWindowDays ?? 90));
    const normalized = input.events.map(normalize).filter((event): event is CanonicalLearningEvent => event !== null && event.enterpriseId === input.enterpriseId);
    const groups = new Map<string, CanonicalLearningEvent[]>();
    for (const event of normalized) groups.set(groupKey(event), [...(groups.get(groupKey(event)) ?? []), event]);
    const patterns: EnterpriseTrustPattern[] = [];
    for (const events of groups.values()) {
      events.sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt) || left.eventId.localeCompare(right.eventId));
      const bounded = events.filter((event) => Date.parse(events.at(-1)!.occurredAt) - Date.parse(event.occurredAt) <= windowDays * 86_400_000);
      if (bounded.length < minimum) continue;
      const first = bounded[0];
      const last = bounded.at(-1)!;
      const strength = evidenceStrength(bounded);
      const eventReferences = bounded.map((event) => event.eventId).sort();
      const patternIdentity = { enterpriseId: input.enterpriseId, patternType: first.eventType, subjectReference: first.subjectReference, workflowReference: first.workflowReference ?? null, providerReference: first.providerReference ?? null, eventReferences };
      const patternId = deterministicUuid(patternIdentity);
      const materiality = bounded.reduce<PatternMateriality>((highest, event) => materialityRank[event.materiality as PatternMateriality] > materialityRank[highest] ? event.materiality as PatternMateriality : highest, "low");
      const corrected = bounded.some((event) => Boolean(event.correctedEventReference));
      const source = {
        patternId,
        enterpriseId: input.enterpriseId,
        patternType: first.eventType as EnterpriseTrustPatternType,
        subjectTypes: unique(bounded.map((event) => event.subjectType)),
        subjectReferences: unique(bounded.map((event) => event.subjectReference)),
        workflowReferences: unique(bounded.map((event) => event.workflowReference)),
        authorityReferences: unique(bounded.map((event) => event.authorityReference)),
        policyReferences: unique(bounded.map((event) => event.policyReference)),
        providerReferences: unique(bounded.map((event) => event.providerReference)),
        incidentReferences: unique(bounded.map((event) => event.incidentReference)),
        decisionReferences: unique(bounded.map((event) => event.decisionReference)),
        evidenceReferences: unique(bounded.flatMap((event) => event.evidenceReferences)),
        supportingEventReferences: eventReferences,
        supportingEventCount: bounded.length,
        firstObservedAt: first.occurredAt,
        lastObservedAt: last.occurredAt,
        recurrenceWindow: { days: windowDays, start: first.occurredAt, end: last.occurredAt },
        materiality,
        evidenceStrength: strength,
        confidenceClassification: confidence(bounded, strength),
        uncertainty: strength === "strong" ? ["Historical recurrence does not establish causation or future certainty."] : ["Evidence coverage is incomplete.", "Historical recurrence does not establish causation or future certainty."],
        limitations: ["Derived from tenant-bound canonical references only.", "Pattern detection cannot alter a canonical decision.", "No abuse, fraud, intent or causal inference is made."],
        status: corrected ? "corrected" as const : "active" as const,
        reviewerState: "pending" as const,
        supersedesPatternId: null,
        createdAt: last.occurredAt,
        updatedAt: last.occurredAt,
      };
      patterns.push({ ...source, canonicalDigest: hashCanonical(source) });
    }
    return patterns.sort((left, right) => left.patternType.localeCompare(right.patternType) || left.patternId.localeCompare(right.patternId));
  }
}
