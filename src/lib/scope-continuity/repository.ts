import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ScopeContinuityArtifacts, ScopeContinuityDecision, ScopeContinuityEvaluationInput } from "./types.ts";

function failure(operation: string, error: unknown): never {
  console.error("Scope Continuity persistence failed safely.", { operation, code: (error as { code?: string })?.code ?? "UNKNOWN" });
  throw Object.assign(new Error("Scope Continuity persistence failed safely."), { status: 500, code: "SCOPE_CONTINUITY_PERSISTENCE_FAILED" });
}

function camelize(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value]));
}

export function scopeContinuityRepository() {
  const db = createServiceRoleClient();
  return {
    async canonicalInputs(enterpriseId: string, input: ScopeContinuityEvaluationInput) {
      const ids = input.attestations.map((item) => item.id);
      const [declaration, authorization, attestations, decisions] = await Promise.all([
        db.from("execution_context_declarations").select("*").eq("enterprise_id", enterpriseId).eq("id", input.declaration.id).maybeSingle(),
        db.from("scope_authorization_leases").select("*").eq("enterprise_id", enterpriseId).eq("id", input.authorization.id).maybeSingle(),
        ids.length ? db.from("environment_attestations").select("*").eq("enterprise_id", enterpriseId).in("id", ids) : Promise.resolve({ data: [], error: null }),
        db.from("scope_continuity_decisions").select("id", { count: "exact", head: true }).eq("enterprise_id", enterpriseId).eq("authorization_id", input.authorization.id),
      ]);
      if (declaration.error) failure("read canonical declaration", declaration.error);
      if (authorization.error) failure("read canonical authorization", authorization.error);
      if (attestations.error) failure("read canonical attestations", attestations.error);
      if (decisions.error) failure("count authorization actions", decisions.error);
      return {
        declaration: declaration.data ? camelize(declaration.data as Record<string, unknown>) : null,
        authorization: authorization.data ? { ...camelize(authorization.data as Record<string, unknown>), consumedActionCount: decisions.count ?? 0 } : null,
        attestations: new Map((attestations.data ?? []).map((row) => { const value = camelize(row as Record<string, unknown>); return [String(value.id), value]; })),
        consumedActionCount: decisions.count ?? 0,
      };
    },
    async persist(input: ScopeContinuityEvaluationInput, decision: ScopeContinuityDecision, artifacts: ScopeContinuityArtifacts, actorId: string) {
      const result = await db.rpc("persist_scope_continuity_decision_v1", { p_input: input, p_decision: decision, p_artifacts: artifacts, p_actor_id: actorId, p_correlation_id: decision.correlationId });
      if (result.error) failure("persist evaluation", result.error);
      return result.data;
    },
    async decision(enterpriseId: string, decisionId: string) {
      const [decision, contradictions] = await Promise.all([
        db.from("scope_continuity_decisions").select("*").eq("enterprise_id", enterpriseId).eq("id", decisionId).maybeSingle(),
        db.from("context_contradiction_events").select("*").eq("enterprise_id", enterpriseId).eq("decision_id", decisionId).order("detected_at"),
      ]);
      if (decision.error) failure("read decision", decision.error);
      if (contradictions.error) failure("read contradictions", contradictions.error);
      return decision.data ? { decision: decision.data, contradictions: contradictions.data ?? [] } : null;
    },
    async replay(enterpriseId: string, executionContextId: string) {
      const result = await db.from("scope_continuity_replay").select("*").eq("enterprise_id", enterpriseId).eq("execution_context_id", executionContextId).order("occurred_at").order("id");
      if (result.error) failure("read replay", result.error);
      return result.data ?? [];
    },
  };
}
