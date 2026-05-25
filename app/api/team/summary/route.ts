import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { demoTeamSummary } from "@/lib/trust-engine/teamWorkspace";

async function tryCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  teamId: string,
  statusColumn?: string,
  statusValues: string[] = []
) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);

  if (statusColumn && statusValues.length) {
    query = query.in(statusColumn, statusValues);
  }

  const { count, error } = await query;

  if (error) return null;

  return count ?? 0;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id,role,member_email,invitation_status")
    .eq("member_email", user.email)
    .eq("invitation_status", "active")
    .limit(1)
    .maybeSingle();

  // Future: enforce row-level security by team_id for all team-owned reads.
  if (membershipError || !membership?.team_id) {
    await createSignal(supabase, "team_workspace_opened");
    await createAuditLog(supabase, "team_workspace_accessed", user.email, {
      source: "team_summary_api",
      demo_fallback: true,
    });

    return NextResponse.json({
      ok: true,
      ...demoTeamSummary,
      message: "team-owned data will appear here.",
    });
  }

  const teamId = String(membership.team_id);
  const [openCases, pendingReviews, activeMembers] = await Promise.all([
    tryCount(supabase, "verification_cases", teamId, "status", [
      "pending",
      "in_review",
      "escalated",
    ]),
    tryCount(supabase, "decisions", teamId, "status", [
      "pending",
      "in_review",
    ]),
    tryCount(supabase, "team_members", teamId, "invitation_status", [
      "active",
    ]),
  ]);

  await createSignal(supabase, "team_workspace_opened");
  await createAuditLog(supabase, "team_workspace_accessed", user.email, {
    source: "team_summary_api",
    team_id: teamId,
  });

  return NextResponse.json({
    ok: true,
    team_name: "Team Workspace",
    team_trust_score: 0,
    open_cases: openCases ?? 0,
    pending_reviews: pendingReviews ?? 0,
    active_members: activeMembers ?? 0,
    api_usage: "0 / 5000",
    current_plan: "Teams",
    is_demo: false,
  });
}
