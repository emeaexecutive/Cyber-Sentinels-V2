import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { deterministicUuid } from "../trust-core/hash.ts";
import type { CanonicalLearningEvent, EnterpriseTrustPattern, EvidenceSource, TrustLearningFeedback, TrustLearningSnapshot, TrustResilienceAssessment, TrustSimulationResult } from "./types.ts";

function fail(operation: string, error: unknown): never {
  console.error("Enterprise Trust Learning persistence failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw Object.assign(new Error(`${operation} failed safely.`), { status: 500, code: "TRUST_LEARNING_PERSISTENCE_FAILED" });
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }

export function enterpriseTrustLearningRepository() {
  const db = createServiceRoleClient();
  return {
    async canonicalEvents(enterpriseId: string, limit = 1000): Promise<CanonicalLearningEvent[]> {
      const result = await db.from("trust_events").select("event_id,enterprise_id,event_type,occurred_at,subject_type,subject_id,workflow_id,authority_id,provider_key,evidence_references,normalized_facts,supersedes_event_id").eq("enterprise_id", enterpriseId).eq("schema_version", "trust-event-v1").order("occurred_at", { ascending: false }).limit(Math.min(2000, Math.max(2, limit)));
      if (result.error) fail("Canonical learning source retrieval", result.error);
      return (result.data ?? []).map((row) => {
        const facts = object(row.normalized_facts);
        return {
          eventId: String(row.event_id), enterpriseId, eventType: String(facts.learningPatternType ?? row.event_type), occurredAt: String(row.occurred_at),
          subjectType: String(row.subject_type ?? "UNKNOWN"), subjectReference: String(row.subject_id), workflowReference: row.workflow_id ? String(row.workflow_id) : null,
          authorityReference: row.authority_id ? String(row.authority_id) : null, policyReference: facts.policyReference ? String(facts.policyReference) : null,
          providerReference: row.provider_key ? String(row.provider_key) : null, incidentReference: facts.incidentReference ? String(facts.incidentReference) : null,
          decisionReference: facts.decisionReference ? String(facts.decisionReference) : null, evidenceReferences: strings(row.evidence_references),
          materiality: ["low", "moderate", "high", "critical", "none"].includes(String(facts.materiality)) ? String(facts.materiality) as CanonicalLearningEvent["materiality"] : "moderate",
          correctedEventReference: row.supersedes_event_id ? String(row.supersedes_event_id) : null, outcome: facts.outcome ? String(facts.outcome) : null,
        };
      });
    },
    async persistPatterns(enterpriseId: string, actorId: string, patterns: EnterpriseTrustPattern[], correlationId: string) {
      if (!patterns.length) return { persisted: 0 };
      const rows = patterns.map((pattern) => ({ enterprise_id: enterpriseId, pattern_id: pattern.patternId, pattern_type: pattern.patternType, pattern, status: pattern.status, reviewer_state: pattern.reviewerState, canonical_digest: pattern.canonicalDigest, first_observed_at: pattern.firstObservedAt, last_observed_at: pattern.lastObservedAt, supporting_event_count: pattern.supportingEventCount, supersedes_pattern_id: pattern.supersedesPatternId, actor_id: actorId, correlation_id: correlationId }));
      const versions = patterns.map((pattern) => ({ enterprise_id: enterpriseId, version_id: deterministicUuid({ patternId: pattern.patternId, digest: pattern.canonicalDigest }), pattern_id: pattern.patternId, pattern: pattern, canonical_digest: pattern.canonicalDigest, source_references: pattern.evidenceReferences, actor_id: actorId, correlation_id: correlationId }));
      const result = await db.from("enterprise_trust_patterns").upsert(rows, { onConflict: "enterprise_id,pattern_id" });
      if (result.error) fail("Trust pattern persistence", result.error);
      const versionResult = await db.from("enterprise_trust_pattern_versions").upsert(versions, { onConflict: "enterprise_id,pattern_id,canonical_digest", ignoreDuplicates: true });
      if (versionResult.error) fail("Trust pattern version persistence", versionResult.error);
      return { persisted: patterns.length };
    },
    async patterns(enterpriseId: string, limit = 100): Promise<EnterpriseTrustPattern[]> {
      const result = await db.from("enterprise_trust_patterns").select("pattern").eq("enterprise_id", enterpriseId).order("last_observed_at", { ascending: false }).limit(Math.min(200, Math.max(1, limit)));
      if (result.error) fail("Trust pattern retrieval", result.error);
      return (result.data ?? []).map((row) => row.pattern as EnterpriseTrustPattern);
    },
    async pattern(enterpriseId: string, patternId: string): Promise<EnterpriseTrustPattern | null> {
      const result = await db.from("enterprise_trust_patterns").select("pattern").eq("enterprise_id", enterpriseId).eq("pattern_id", patternId).maybeSingle();
      if (result.error) fail("Trust pattern retrieval", result.error);
      return result.data ? result.data.pattern as EnterpriseTrustPattern : null;
    },
    async evidenceSources(enterpriseId: string, references: string[]): Promise<EvidenceSource[]> {
      if (!references.length) return [];
      const result = await db.from("evidence_objects").select("id,provider_key,evidence_classification,storage_boundary,occurred_at").eq("enterprise_id", enterpriseId).in("id", references);
      if (result.error) fail("Grounded evidence retrieval", result.error);
      return (result.data ?? []).map((row) => ({ reference: String(row.id), summary: `${row.evidence_classification} evidence from ${row.provider_key}; raw payload excluded.`, sourceVersion: String(row.occurred_at), classification: "observed_evidence", sensitive: row.storage_boundary === "EVIDENCE_VAULT" }));
    },
    async snapshot(enterpriseId: string): Promise<TrustLearningSnapshot> {
      const [objects, decisions, events] = await Promise.all([
        db.from("enterprise_trust_objects").select("subject_id,current_state_decision_id,evidence_graph_node_id").eq("enterprise_id", enterpriseId).limit(500),
        db.from("trust_fabric_decisions").select("decision_id,subject_id,workflow_id,outcome,envelope").eq("enterprise_id", enterpriseId).limit(500),
        db.from("trust_events").select("event_id,workflow_id,authority_id,provider_key,evidence_references").eq("enterprise_id", enterpriseId).eq("schema_version", "trust-event-v1").limit(1000),
      ]);
      for (const [name, result] of [["objects", objects], ["decisions", decisions], ["events", events]] as const) if (result.error) fail(`Trust learning snapshot ${name}`, result.error);
      const eventRows = events.data ?? [];
      const workflowRefs = [...new Set(eventRows.map((row) => row.workflow_id).filter(Boolean).map(String))];
      return {
        enterpriseId, capturedAt: new Date().toISOString(),
        trustObjects: (objects.data ?? []).map((row) => ({ reference: String(row.subject_id), evidenceReferences: row.evidence_graph_node_id ? [String(row.evidence_graph_node_id)] : [], workflowReferences: (decisions.data ?? []).filter((decision) => decision.subject_id === row.subject_id && decision.workflow_id).map((decision) => String(decision.workflow_id)) })),
        authorities: [...new Set(eventRows.map((row) => row.authority_id).filter(Boolean).map(String))].map((reference) => ({ reference, active: true })),
        workflows: workflowRefs.map((reference) => { const linked = eventRows.filter((row) => row.workflow_id === reference); const decision = (decisions.data ?? []).find((row) => row.workflow_id === reference); const normalized = String(decision?.outcome ?? "review").toLowerCase(); return { reference, authorityReferences: [...new Set(linked.map((row) => row.authority_id).filter(Boolean).map(String))], providerReferences: [...new Set(linked.map((row) => row.provider_key).filter(Boolean).map(String))], evidenceReferences: [...new Set(linked.flatMap((row) => strings(row.evidence_references)))], decision: normalized.includes("deny") || normalized.includes("breach") ? "deny" : normalized.includes("allow") || normalized.includes("satisfied") ? "allow" : "review" }; }),
        incidents: [],
      };
    },
    async persistSimulation(enterpriseId: string, actorId: string, result: TrustSimulationResult, correlationId: string) { const response = await db.from("trust_simulation_runs").upsert({ enterprise_id: enterpriseId, simulation_id: deterministicUuid({ enterpriseId, digest: result.simulationDigest }), simulation_type: result.simulationType, result, snapshot_digest: result.snapshotDigest, simulation_digest: result.simulationDigest, actor_id: actorId, correlation_id: correlationId }, { onConflict: "enterprise_id,simulation_id", ignoreDuplicates: true }); if (response.error) fail("Trust learning simulation persistence", response.error); },
    async persistResilience(enterpriseId: string, actorId: string, assessment: TrustResilienceAssessment, correlationId: string) { const response = await db.from("trust_resilience_assessments").upsert({ enterprise_id: enterpriseId, assessment_id: deterministicUuid({ enterpriseId, digest: assessment.digest }), state: assessment.state, assessment, canonical_digest: assessment.digest, actor_id: actorId, correlation_id: correlationId }, { onConflict: "enterprise_id,assessment_id", ignoreDuplicates: true }); if (response.error) fail("Trust resilience persistence", response.error); },
    async persistFeedback(feedback: TrustLearningFeedback, correlationId: string) { const response = await db.from("trust_intelligence_reviewer_feedback").insert({ enterprise_id: feedback.enterpriseId, feedback_id: feedback.feedbackId, output_id: feedback.outputReference, reviewer_id: feedback.reviewerReference, reviewer_role: feedback.reviewerRole, source_version: feedback.sourceVersion, label: feedback.label, reason: feedback.reason, correction: feedback.correction, feedback, canonical_digest: feedback.digest, correlation_id: correlationId }); if (response.error) { if ((response.error as { code?: string }).code === "23505") throw Object.assign(new Error("Feedback already exists for this reviewer, output and source version."), { status: 409, code: "TRUST_LEARNING_FEEDBACK_DUPLICATE" }); fail("Trust learning feedback persistence", response.error); } },
    async modelEvaluations(enterpriseId: string) { const result = await db.from("model_evaluation_runs").select("evaluation_id,provider_id,model_id,model_version,prompt_template_version,status,metrics,thresholds,promotion_eligible,limitations,created_at").eq("enterprise_id", enterpriseId).order("created_at", { ascending: false }).limit(100); if (result.error) fail("Model evaluation retrieval", result.error); return result.data ?? []; },
  };
}
