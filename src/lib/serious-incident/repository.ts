import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ReviewerRole, SeriousIncidentArtifacts, SeriousIncidentAssessmentInput, ScreeningResult } from "./types.ts";

function failure(operation: string, error: unknown): never {
  console.error("Serious-incident persistence failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw Object.assign(new Error("Serious-incident persistence failed safely."), { status: 500, code: "SERIOUS_INCIDENT_PERSISTENCE_FAILED" });
}

export function seriousIncidentRepository() {
  const db = createServiceRoleClient();
  return {
    async assessment(enterpriseId: string, incidentId: string) {
      const result = await db.from("incident_regulatory_assessments").select("*").eq("enterprise_id", enterpriseId).eq("id", incidentId).maybeSingle();
      if (result.error) failure("read assessment", result.error); return result.data;
    },
    async create(input: SeriousIncidentAssessmentInput, screening: ScreeningResult, artifacts: SeriousIncidentArtifacts, actorId: string, correlationId: string) {
      const result = await db.rpc("persist_serious_incident_case_v1", { p_case: input, p_screening: screening, p_artifacts: artifacts, p_actor_id: actorId, p_correlation_id: correlationId });
      if (result.error) failure("create assessment", result.error); return result.data;
    },
    async append(enterpriseId: string, incidentId: string, kind: string, record: Record<string, unknown>, actorId: string, correlationId: string) {
      const result = await db.rpc("append_serious_incident_record_v1", { p_enterprise_id: enterpriseId, p_incident_id: incidentId, p_kind: kind, p_record: record, p_actor_id: actorId, p_correlation_id: correlationId });
      if (result.error) failure(`append ${kind}`, result.error); return result.data;
    },
    async assignedReviewerRoles(enterpriseId: string, incidentId: string, actorId: string): Promise<ReviewerRole[]> {
      const result = await db.from("incident_responsibility_roles").select("role_type").eq("enterprise_id", enterpriseId).eq("incident_id", incidentId).eq("party_reference", actorId).is("superseded_at", null);
      if (result.error) failure("read reviewer authority", result.error); return (result.data ?? []).map((row) => String(row.role_type) as ReviewerRole);
    },
    async reviewerDecision(enterpriseId: string, incidentId: string, decisionId: string) {
      const result = await db.from("incident_reviewer_decisions").select("*").eq("enterprise_id", enterpriseId).eq("incident_id", incidentId).eq("id", decisionId).maybeSingle();
      if (result.error) failure("read reviewer decision", result.error); return result.data;
    },
    async package(enterpriseId: string, incidentId: string, packageId: string) {
      const result = await db.from("incident_submission_packages").select("*").eq("enterprise_id", enterpriseId).eq("incident_id", incidentId).eq("id", packageId).maybeSingle();
      if (result.error) failure("read submission package", result.error); return result.data;
    },
    async bundle(enterpriseId: string, incidentId: string) {
      const tables = ["incident_regulatory_assessments", "incident_responsibility_roles", "incident_chronology_events", "incident_evidence_snapshots", "incident_impact_assessments", "incident_regulatory_trigger_findings", "incident_reviewer_decisions", "incident_submission_packages", "incident_external_submissions", "incident_corrective_actions", "incident_evidence_supersessions"];
      const results = await Promise.all(tables.map((table) => db.from(table).select("*").eq("enterprise_id", enterpriseId).eq(table === "incident_regulatory_assessments" ? "id" : "incident_id", incidentId).order("created_at", { ascending: true })));
      results.forEach((result, index) => { if (result.error) failure(`read ${tables[index]}`, result.error); });
      return Object.fromEntries(tables.map((table, index) => [table, results[index].data ?? []]));
    },
    async replay(enterpriseId: string, incidentId: string) {
      const result = await db.from("incident_reporting_replay").select("*").eq("enterprise_id", enterpriseId).eq("incident_id", incidentId).order("occurred_at").order("id");
      if (result.error) failure("read incident replay", result.error); return result.data ?? [];
    },
  };
}
