import { NextResponse } from "next/server";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

type AnyRow = Record<string, any>;

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 200
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return error ? [] : data ?? [];
}

function activeAlert(row: AnyRow) {
  return ["active", "in_review"].includes(String(row.status ?? "active").toLowerCase());
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = isAdminAllowlisted(user.email);
  const [certifications, alerts, agents, provenanceEvents, auditEvents] = await Promise.all([
    fetchRows(supabase, "trust_certifications"),
    fetchRows(supabase, "trust_alerts"),
    fetchRows(supabase, "ai_agents"),
    fetchRows(supabase, "provenance_events"),
    fetchRows(supabase, "audit_logs", 100),
  ]);

  const scopedCertifications = isAdmin
    ? certifications
    : certifications.filter((row) => String(row.created_by ?? "") === user.id);
  const scopedAlerts = isAdmin ? alerts : alerts.filter((row) => String(row.created_by ?? "") === user.id);
  const scopedAgents = isAdmin ? agents : agents.filter((row) => String(row.owner_user_id ?? "") === user.id);
  const activeAlerts = scopedAlerts.filter(activeAlert);

  return NextResponse.json({
    ok: true,
    summary: {
      verified_humans: scopedCertifications.filter(
        (row) => row.certification_type === "verified_human" && row.status === "verified"
      ).length,
      verified_ai_agents: scopedAgents.filter((row) =>
        ["verified", "approved"].includes(String(row.status ?? row.verification_status ?? "").toLowerCase())
      ).length,
      pending_reviews:
        scopedCertifications.filter((row) => row.status === "pending").length +
        scopedAlerts.filter((row) => row.status === "in_review").length +
        scopedAgents.filter((row) => row.status === "pending").length,
      active_trust_alerts: activeAlerts.length,
      failed_verifications: scopedCertifications.filter((row) => row.status === "failed").length,
      recent_audit_events: auditEvents.slice(0, 10),
      threat_trend_summary: {
        behavioural_drift: activeAlerts.filter((row) => row.alert_type === "behavioural_drift").length,
        verification_failures: activeAlerts.filter((row) => row.alert_type === "verification_failure").length,
        permission_escalations: activeAlerts.filter((row) => row.alert_type === "ai_agent_permission_escalation").length,
        workflow_anomalies: activeAlerts.filter((row) => row.alert_type === "workflow_anomaly").length,
        synthetic_identity_flags: activeAlerts.filter((row) => row.alert_type === "synthetic_identity_flag").length,
        provenance_events: provenanceEvents.length,
      },
    },
  });
}
