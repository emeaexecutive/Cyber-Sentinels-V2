import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CanonicalTrustEvent } from "../trust-events/types.ts";
import type { TrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import type { EvidenceObject } from "../trust-architecture/evidence.ts";
import type { TrustState, TrustStateDecision } from "../trust-state/types.ts";
import type { ContinuousTrustAssessment, ContinuousTrustPolicy, PreviousRuntimeState, RuntimeProviderHealth } from "./types.ts";
import { defaultContinuousTrustPolicy } from "./types.ts";

function fail(operation: string, error: unknown): never {
  const candidate = error as { code?: string; message?: string };
  const constraint = candidate.message?.match(/constraint "([^"]+)"/i)?.[1] ?? null;
  const column = candidate.message?.match(/null value in column "([^"]+)"/i)?.[1] ?? null;
  console.error("Continuous Trust persistence failed.", {
    operation,
    code: candidate.code ?? "UNKNOWN",
    constraint,
    column,
  });
  throw Object.assign(new Error(`${operation} failed safely.`), { status: 500, code: "CONTINUOUS_TRUST_PERSISTENCE_FAILED" });
}

function rows<T>(result: { data: T[] | null; error: unknown }, operation: string): T[] { if (result.error) fail(operation, result.error); return result.data ?? []; }
function strings(value: unknown) { return Array.isArray(value) ? value.map(String) : []; }

export function continuousTrustRepository() {
  const db = createServiceRoleClient();
  return {
    async current(enterpriseId: string, subjectId: string): Promise<PreviousRuntimeState | null> {
      const result = await db.from("subject_trust_state").select("state,normalized_score,confidence,evidence_freshness,policy_version,current_risk_flags,current_state_decision_id").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).maybeSingle();
      if (result.error) fail("Current runtime trust state", result.error);
      if (!result.data) return null;
      return { state: String(result.data.state) as TrustState, score: result.data.normalized_score === null ? null : Number(result.data.normalized_score), confidence: Number(result.data.confidence ?? 0), evidenceFreshness: result.data.evidence_freshness ? String(result.data.evidence_freshness) as PreviousRuntimeState["evidenceFreshness"] : null, policyVersion: result.data.policy_version ? String(result.data.policy_version) : null, riskFlags: strings(result.data.current_risk_flags), stateDecisionId: result.data.current_state_decision_id ? String(result.data.current_state_decision_id) : null };
    },
    async evidence(enterpriseId: string, subjectId: string, limit = 500): Promise<EvidenceObject[]> {
      const result = await db.from("evidence_objects").select("evidence_id,enterprise_id,domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,cryptographically_verified,server_verified,occurred_at,observed_at,received_at,expires_at,freshness_policy_seconds,revoked_at,superseded_by_evidence_id,payload_hash,canonicalization,hash_algorithm,reason_codes").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).is("superseded_by_evidence_id", null).order("received_at", { ascending: false }).limit(Math.min(500, Math.max(1, limit)));
      return rows(result, "Continuous Trust evidence").map((row) => {
        const observedAt = String(row.observed_at ?? row.occurred_at);
        const policySeconds = Number(row.freshness_policy_seconds);
        const policyExpiry = Number.isFinite(policySeconds) && policySeconds > 0 ? Date.parse(observedAt) + policySeconds * 1000 : null;
        const explicitExpiry = row.expires_at ? Date.parse(String(row.expires_at)) : null;
        const effectiveExpiry = policyExpiry === null ? explicitExpiry : explicitExpiry === null ? policyExpiry : Math.min(policyExpiry, explicitExpiry);
        return { evidenceId: String(row.evidence_id), enterpriseId: String(row.enterprise_id), domainKey: String(row.domain_key), subjectId: String(row.subject_id), subjectType: String(row.subject_type), evidenceType: String(row.evidence_type), sourceType: String(row.source_type), sourceKey: String(row.source_key), result: (row.revoked_at ? "REVOKED" : String(row.result)) as EvidenceObject["result"], assuranceLevel: String(row.assurance_level) as EvidenceObject["assuranceLevel"], cryptographicallyVerified: row.cryptographically_verified === true, serverVerified: row.server_verified === true, occurredAt: observedAt, receivedAt: String(row.received_at), ...(effectiveExpiry === null ? {} : { expiresAt: new Date(effectiveExpiry).toISOString() }), payloadHash: String(row.payload_hash), canonicalization: "JCS" as const, hashAlgorithm: "SHA-256" as const, references: [{ refType: "EVIDENCE_OBJECT" as const, refId: String(row.evidence_id) }], reasonCodes: strings(row.reason_codes) };
      });
    },
    async providerHealth(enterpriseId: string, limit = 100): Promise<RuntimeProviderHealth[]> {
      const result = await db.from("provider_health_snapshots").select("provider_key,state,observed_at,latency_ms,error_rate,circuit_open,reason_codes").eq("enterprise_id", enterpriseId).order("observed_at", { ascending: false }).limit(Math.min(500, Math.max(1, limit)));
      const latest = new Map<string, RuntimeProviderHealth>();
      for (const row of rows(result, "Continuous Trust provider health")) { const key = String(row.provider_key).toLowerCase(); if (!latest.has(key)) latest.set(key, { providerKey: key, state: String(row.state) as RuntimeProviderHealth["state"], observedAt: String(row.observed_at), latencyMs: row.latency_ms === null ? null : Number(row.latency_ms), errorRate: row.error_rate === null ? null : Number(row.error_rate), circuitOpen: row.circuit_open === true, reasonCodes: strings(row.reason_codes) }); }
      return [...latest.values()];
    },
    async policy(enterpriseId: string, domainKey: string, asOf: string): Promise<ContinuousTrustPolicy> {
      const result = await db.from("trust_policy_versions").select("policy_id,version,rules,valid_from,valid_until,layer").or(`enterprise_id.is.null,enterprise_id.eq.${enterpriseId}`).eq("active", true).or(`domain_key.is.null,domain_key.eq.${domainKey}`).lte("valid_from", asOf).order("valid_from", { ascending: true });
      if (result.error) fail("Continuous Trust policy", result.error);
      let policy = { ...defaultContinuousTrustPolicy, freshnessByEvidenceType: {} };
      for (const row of result.data ?? []) {
        if (row.valid_until && Date.parse(String(row.valid_until)) <= Date.parse(asOf)) continue;
        const rules = (row.rules && typeof row.rules === "object" ? row.rules : {}) as Record<string, unknown>;
        const continuous = (rules.continuousTrust && typeof rules.continuousTrust === "object" ? rules.continuousTrust : rules) as Record<string, unknown>;
        const number = (key: keyof ContinuousTrustPolicy, fallback: number) => Number.isFinite(Number(continuous[key])) ? Number(continuous[key]) : fallback;
        policy = { ...policy, policyId: String(row.policy_id), policyVersion: String(row.version), trustedScore: number("trustedScore", policy.trustedScore), verifiedScore: number("verifiedScore", policy.verifiedScore), challengedScore: number("challengedScore", policy.challengedScore), blockedScore: number("blockedScore", policy.blockedScore), minimumEvidenceForTrusted: number("minimumEvidenceForTrusted", policy.minimumEvidenceForTrusted), minimumEvidenceForVerified: number("minimumEvidenceForVerified", policy.minimumEvidenceForVerified), defaultFreshnessSeconds: number("defaultFreshnessSeconds", policy.defaultFreshnessSeconds), evaluationIntervalSeconds: number("evaluationIntervalSeconds", policy.evaluationIntervalSeconds), scoreDriftThreshold: number("scoreDriftThreshold", policy.scoreDriftThreshold), confidenceDriftThreshold: number("confidenceDriftThreshold", policy.confidenceDriftThreshold), allowRecoveryFromBlocked: continuous.allowRecoveryFromBlocked === true, freshnessByEvidenceType: continuous.freshnessByEvidenceType && typeof continuous.freshnessByEvidenceType === "object" ? Object.fromEntries(Object.entries(continuous.freshnessByEvidenceType as Record<string, unknown>).map(([key, value]) => [key, Number(value)]).filter(([, value]) => Number.isFinite(value))) : policy.freshnessByEvidenceType };
      }
      return policy;
    },
    async chainHead(enterpriseId: string) {
      const result = await db.from("trust_event_chain_heads").select("last_sequence,last_event_hash").eq("enterprise_id", enterpriseId).eq("partition_key", "default").maybeSingle();
      if (result.error) fail("Continuous Trust event chain", result.error);
      return { sequence: Number(result.data?.last_sequence ?? 0), eventHash: result.data?.last_event_hash ? String(result.data.last_event_hash) : null };
    },
    async assessment(enterpriseId: string, assessmentId: string) {
      const result = await db.from("continuous_trust_assessments").select("assessment_id,state_decision_id,score,confidence,evidence_freshness,transition_type,evaluated_at,next_evaluation_at,assessment_hash").eq("enterprise_id", enterpriseId).eq("assessment_id", assessmentId).maybeSingle();
      if (result.error) fail("Continuous Trust assessment", result.error); return result.data;
    },
    async apply(contract: TrustDecisionContract, decision: TrustStateDecision, event: CanonicalTrustEvent, assessment: ContinuousTrustAssessment & { evaluationDurationMs: number; staleEvidenceCount: number }, correlationId: string) {
      const result = await db.rpc("apply_continuous_trust_assessment_v1", { p_contract: contract, p_decision: decision, p_trust_event: event, p_assessment: assessment, p_correlation_id: correlationId });
      if (result.error) { if (/event chain conflict/i.test(result.error.message)) return { status: "CHAIN_CONFLICT" as const }; if (/compare-and-set conflict/i.test(result.error.message)) return { status: "STATE_CONFLICT" as const }; fail("Continuous Trust assessment", result.error); }
      return result.data as { status: "APPLIED" | "DUPLICATE"; stateDecisionId?: string; state?: TrustState; assessmentId: string };
    },
    async listRuntime(enterpriseId: string, limit: number, before?: string | null) {
      let query = db.from("subject_trust_state").select("enterprise_id,domain_key,subject_id,workflow_id,state,normalized_score,confidence,evidence_freshness,policy_version,last_evaluated_at,next_evaluation_at,current_risk_flags,source_event_id,decision_reason_summary,current_state_decision_id,updated_at").eq("enterprise_id", enterpriseId).order("updated_at", { ascending: false }).order("subject_id", { ascending: true }).limit(limit + 1);
      if (before) query = query.lt("updated_at", before);
      const result = await query; return rows(result, "Runtime trust list");
    },
    async runtimeSubject(enterpriseId: string, subjectId: string) { const result = await db.from("subject_trust_state").select("enterprise_id,domain_key,subject_id,workflow_id,state,normalized_score,confidence,evidence_freshness,policy_version,last_evaluated_at,next_evaluation_at,current_risk_flags,source_event_id,decision_reason_summary,current_state_decision_id,updated_at").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).maybeSingle(); if (result.error) fail("Runtime trust subject", result.error); return result.data; },
    async dueSubjects(enterpriseId: string, asOf: string, limit: number) { const result = await db.from("subject_trust_state").select("subject_id,domain_key").eq("enterprise_id", enterpriseId).lte("next_evaluation_at", asOf).order("next_evaluation_at", { ascending: true }).limit(limit); return rows(result, "Due runtime trust subjects"); },
    async listEvidence(enterpriseId: string, subjectId: string | null, limit: number, before?: string | null) { let query = db.from("evidence_objects").select("evidence_id,domain_key,subject_id,subject_type,evidence_type,source_type,source_key,result,assurance_level,occurred_at,observed_at,received_at,expires_at,freshness_policy_seconds,revoked_at,superseded_by_evidence_id,reason_codes,payload_hash").eq("enterprise_id", enterpriseId).order("received_at", { ascending: false }).limit(limit + 1); if (subjectId) query = query.eq("subject_id", subjectId); if (before) query = query.lt("received_at", before); const result = await query; return rows(result, "Runtime evidence list"); },
    async recentAssessments(enterpriseId: string, limit: number) { const result = await db.from("continuous_trust_assessments").select("assessment_id,state_decision_id,domain_key,subject_id,score,confidence,evidence_freshness,transition_type,policy_id,policy_version,risk_flags,reason_codes,evaluated_at,next_evaluation_at").eq("enterprise_id", enterpriseId).order("evaluated_at", { ascending: false }).limit(limit); return rows(result, "Recent continuous trust assessments"); },
    async alerts(enterpriseId: string, limit: number, status?: string | null) {
      let query = db.from("trust_alerts").select("id,alert_type,status,subject_type,subject_reference,severity,detected_at,acknowledged_at,resolved_at,triggering_event_id,assessment_id,drift_id,policy_id,policy_version,evidence_references,remediation_guidance,assigned_to,updated_at").eq("enterprise_id", enterpriseId).order("detected_at", { ascending: false }).limit(limit);
      if (status) query = query.eq("status", status); const result = await query; return rows(result, "Continuous Trust alerts");
    },
    async drift(enterpriseId: string, subjectId: string, limit: number) { const result = await db.from("trust_drift_findings").select("drift_id,assessment_id,drift_type,severity,rule_id,reason_code,evidence_references,prior_value,current_value,detected_at").eq("enterprise_id", enterpriseId).eq("subject_id", subjectId).order("detected_at", { ascending: false }).limit(limit); return rows(result, "Trust drift findings"); },
    async events(enterpriseId: string, subjectId: string | null, limit: number) { let query = db.from("trust_events").select("event_id,event_type,subject_type,subject_id,event_source,provider_key,normalized_facts,reason_codes,evidence_references,occurred_at,received_at,sequence,event_hash").eq("enterprise_id", enterpriseId).order("received_at", { ascending: false }).limit(limit); if (subjectId) query = query.eq("subject_id", subjectId); const result = await query; return rows(result, "Continuous Trust events"); },
    async transitionAlert(enterpriseId: string, alertId: string, actorId: string, nextState: string, note: string) { const result = await db.rpc("transition_continuous_trust_alert_v1", { p_enterprise_id: enterpriseId, p_alert_id: alertId, p_actor_id: actorId, p_next_state: nextState, p_note: note }); if (result.error) { if (/not found/i.test(result.error.message)) throw Object.assign(new Error("Alert was not found."), { status: 404, code: "ALERT_NOT_FOUND" }); fail("Continuous Trust alert transition", result.error); } return result.data; },
    async replayAssessment(enterpriseId: string, decisionId: string) { const result = await db.from("continuous_trust_assessments").select("*,trust_drift_findings(*),trust_alerts(id,alert_type,status,severity,detected_at,acknowledged_at,resolved_at,evidence_references,remediation_guidance)").eq("enterprise_id", enterpriseId).eq("state_decision_id", decisionId).maybeSingle(); if (result.error) fail("Continuous Trust Replay context", result.error); return result.data; },
    async authorityLineage(enterpriseId: string, decisionId: string) { const result = await db.from("trust_references").select("source_type,source_id,ref_type,ref_id,ref_version,created_at").eq("enterprise_id", enterpriseId).eq("source_id", decisionId).eq("ref_type", "AUTHORITY").order("created_at", { ascending: true }).limit(100); return rows(result, "Continuous Trust authority lineage"); },
  };
}
