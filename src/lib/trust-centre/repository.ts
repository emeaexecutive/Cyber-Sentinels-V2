import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { continuousTrustRepository } from "@/src/lib/continuous-trust/repository";
import { trustArchitectureRepository } from "@/src/lib/trust-architecture/repository";
import { deriveTrustDna, highRisk, trustHealth, trustScoreDistribution } from "./projections";
import { trustCentreCapabilities } from "./permissions";
import type {
  EnterpriseTrustCentreRole,
  TrustCentreRow,
  TrustCentreSearchResult,
  TrustCentreSnapshot,
} from "./types";

function fail(operation: string, error: unknown): never {
  console.error("Enterprise Trust Centre read model failed.", {
    operation,
    code: (error as { code?: string })?.code ?? "UNKNOWN",
  });
  throw Object.assign(new Error(`${operation} failed safely.`), {
    status: 500,
    code: "TRUST_CENTRE_PERSISTENCE_FAILED",
  });
}

function rows(result: { data: TrustCentreRow[] | null; error: unknown }, operation: string) {
  if (result.error) fail(operation, result.error);
  return result.data ?? [];
}

export function enterpriseTrustCentreRepository() {
  const db = createServiceRoleClient();
  const runtimeRepository = continuousTrustRepository();
  const architectureRepository = trustArchitectureRepository();

  return {
    async snapshot(
      enterpriseId: string,
      organisationName: string,
      role: EnterpriseTrustCentreRole,
      limit = 100
    ): Promise<TrustCentreSnapshot> {
      const bounded = Math.min(200, Math.max(20, limit));
      const [
        runtime,
        alerts,
        providerHealth,
        evidence,
        assessments,
        policies,
        replayActivity,
      ] = await Promise.all([
        runtimeRepository.listRuntime(enterpriseId, bounded),
        runtimeRepository.alerts(enterpriseId, bounded),
        runtimeRepository.providerHealth(enterpriseId, bounded),
        runtimeRepository.listEvidence(enterpriseId, null, bounded),
        runtimeRepository.recentAssessments(enterpriseId, bounded),
        architectureRepository.policies(enterpriseId),
        runtimeRepository.events(enterpriseId, null, bounded),
      ]);

      const runtimeRows = runtime.slice(0, bounded);
      const evidenceRows = evidence.slice(0, bounded);
      const risky = highRisk(runtimeRows);
      const openAlerts = alerts.filter(
        (row) => !["resolved", "dismissed"].includes(String(row.status))
      );
      const pendingReviews = runtimeRows.filter((row) =>
        ["CHALLENGED", "INCONCLUSIVE"].includes(String(row.state).toUpperCase())
      );
      const aiAgents = runtimeRows.filter(
        (row) =>
          String(row.domain_key).toUpperCase() === "AI_AGENT"
      );
      const verificationQueue = runtimeRows.filter((row) =>
        ["CHALLENGED", "INCONCLUSIVE", "OBSERVED", "EXPIRED"].includes(
          String(row.state).toUpperCase()
        )
      );
      const manualReviews = [
        ...pendingReviews,
        ...openAlerts.filter((row) =>
          /review|manual|investigat/i.test(
            `${row.alert_type ?? ""} ${row.status ?? ""}`
          )
        ),
      ].slice(0, bounded);
      const policyRows = policies.map((policy) => {
        const policyId = String(policy.policy_id ?? "");
        const decisions = assessments.filter(
          (assessment) => String(assessment.policy_id ?? "") === policyId
        );
        return {
          ...policy,
          trigger_count: decisions.length,
          recent_decision_at: decisions[0]?.evaluated_at ?? null,
        };
      });

      return {
        generatedAt: new Date().toISOString(),
        organisation: { id: enterpriseId, name: organisationName, role },
        overview: {
          subjectCount: runtimeRows.length,
          currentTrustHealth: trustHealth(runtimeRows),
          openAlertCount: openAlerts.length,
          highRiskCount: risky.length,
          pendingReviewCount: pendingReviews.length,
          providerCount: providerHealth.length,
          replayActivityCount: replayActivity.length,
          policyCount: policyRows.length,
        },
        distribution: trustScoreDistribution(runtimeRows),
        runtime: runtimeRows,
        highRiskEntities: risky,
        alerts,
        providerHealth,
        evidence: evidenceRows,
        assessments,
        policies: policyRows,
        replayActivity,
        aiAgents,
        verificationQueue,
        manualReviews,
        trustDna: deriveTrustDna(evidenceRows, assessments),
        capabilities: trustCentreCapabilities(role),
        dataAvailability: {
          trustGraph: evidenceRows.length > 0,
          trustDna: evidenceRows.length > 0,
          replay: replayActivity.length > 0,
          continuousTrust: runtimeRows.length > 0,
          providerOperations: providerHealth.length > 0,
        },
      };
    },

    async search(
      enterpriseId: string,
      rawQuery: string,
      limit = 25
    ): Promise<TrustCentreSearchResult[]> {
      const query = rawQuery.trim();
      if (query.length < 2 || query.length > 100) {
        throw Object.assign(new Error("Search query must contain 2 to 100 characters."), {
          status: 400,
          code: "SEARCH_QUERY_INVALID",
        });
      }
      const safe = query.replace(/[,%_()]/g, " ").replace(/\s+/g, " ").trim();
      const pattern = `%${safe}%`;
      const bounded = Math.min(50, Math.max(1, limit));
      const [subjects, nodes, evidence, events, policies] = await Promise.all([
        db
          .from("trust_subjects")
          .select("subject_id,subject_type,display_label,domain_key,created_at")
          .eq("enterprise_id", enterpriseId)
          .or(`subject_id.ilike.${pattern},display_label.ilike.${pattern}`)
          .limit(bounded),
        db
          .from("evidence_graph_nodes")
          .select("external_id,node_type,label,domain_key,created_at")
          .eq("enterprise_id", enterpriseId)
          .or(`external_id.ilike.${pattern},label.ilike.${pattern}`)
          .limit(bounded),
        db
          .from("evidence_objects")
          .select("evidence_id,subject_id,evidence_type,source_key,received_at")
          .eq("enterprise_id", enterpriseId)
          .or(`subject_id.ilike.${pattern},evidence_type.ilike.${pattern},source_key.ilike.${pattern}`)
          .limit(bounded),
        db
          .from("trust_events")
          .select("event_id,event_type,subject_id,provider_key,occurred_at")
          .eq("enterprise_id", enterpriseId)
          .or(`subject_id.ilike.${pattern},event_type.ilike.${pattern},provider_key.ilike.${pattern}`)
          .limit(bounded),
        db
          .from("trust_policy_versions")
          .select("policy_version_id,policy_id,version,domain_key,created_at")
          .or(`enterprise_id.is.null,enterprise_id.eq.${enterpriseId}`)
          .ilike("policy_id", pattern)
          .limit(bounded),
      ]);
      const checked = [
        rows(subjects, "Trust Centre subject search").map((row) => ({
          id: String(row.subject_id),
          type: String(row.subject_type ?? row.domain_key ?? "SUBJECT"),
          label: String(row.display_label ?? row.subject_id),
          description: `${row.domain_key ?? "Trust"} subject`,
          href: `/trust-centre?subject=${encodeURIComponent(String(row.subject_id))}`,
          occurredAt: row.created_at ? String(row.created_at) : null,
        })),
        rows(nodes, "Trust Centre graph search").map((row) => ({
          id: String(row.external_id),
          type: String(row.node_type ?? "RELATIONSHIP"),
          label: String(row.label ?? row.external_id),
          description: `${row.domain_key ?? "Trust graph"} node`,
          href: `/trust-centre?subject=${encodeURIComponent(String(row.external_id))}&view=graph`,
          occurredAt: row.created_at ? String(row.created_at) : null,
        })),
        rows(evidence, "Trust Centre evidence search").map((row) => ({
          id: String(row.evidence_id),
          type: "EVIDENCE",
          label: String(row.evidence_type ?? "Evidence object"),
          description: `Evidence for ${row.subject_id ?? "protected subject"}`,
          href: `/trust-centre?subject=${encodeURIComponent(String(row.subject_id))}&view=evidence`,
          occurredAt: row.received_at ? String(row.received_at) : null,
        })),
        rows(events, "Trust Centre replay search").map((row) => ({
          id: String(row.event_id),
          type: "REPLAY_EVENT",
          label: String(row.event_type ?? "Trust event"),
          description: `${row.provider_key ?? "Canonical"} · ${row.subject_id ?? "protected subject"}`,
          href: `/trust-centre?subject=${encodeURIComponent(String(row.subject_id))}&view=replay`,
          occurredAt: row.occurred_at ? String(row.occurred_at) : null,
        })),
        rows(policies, "Trust Centre policy search").map((row) => ({
          id: String(row.policy_version_id),
          type: "POLICY",
          label: String(row.policy_id),
          description: `Version ${row.version ?? "unknown"} · ${row.domain_key ?? "enterprise"}`,
          href: "/trust-centre?view=policies",
          occurredAt: row.created_at ? String(row.created_at) : null,
        })),
      ].flat();
      const unique = new Map<string, TrustCentreSearchResult>();
      for (const result of checked) unique.set(`${result.type}:${result.id}`, result);
      return [...unique.values()].slice(0, bounded);
    },

    async alertActivity(enterpriseId: string, alertId: string) {
      const result = await db
        .from("trust_alert_activity")
        .select("activity_id,action,note,actor_id,assigned_to,created_at")
        .eq("enterprise_id", enterpriseId)
        .eq("alert_id", alertId)
        .order("created_at", { ascending: true })
        .limit(200);
      return rows(result, "Trust Centre alert activity");
    },

    async mutateAlerts(input: {
      enterpriseId: string;
      alertIds: string[];
      actorId: string;
      action: string;
      note: string;
      assignedTo?: string | null;
      correlationId: string;
    }) {
      const result = await db.rpc("manage_trust_centre_alerts_v1", {
        p_enterprise_id: input.enterpriseId,
        p_alert_ids: input.alertIds,
        p_actor_id: input.actorId,
        p_action: input.action,
        p_note: input.note,
        p_assigned_to: input.assignedTo ?? null,
        p_correlation_id: input.correlationId,
      });
      if (result.error) fail("Trust Centre alert action", result.error);
      return result.data;
    },
  };
}
