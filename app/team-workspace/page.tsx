import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  demoTeamCases,
  demoTeamDecisions,
  demoTeamEvidence,
  demoTeamMembers,
  demoTeamPassports,
  demoTeamReports,
  demoTeamSummary,
  futureTeamFields,
  teamPermissions,
  teamRoles,
  teamWorkspaceSignals,
} from "@/lib/trust-engine/teamWorkspace";

export const dynamic = "force-dynamic";

type TeamMember = {
  id: string;
  team_id?: string | null;
  member_email: string | null;
  role: string | null;
  invitation_status: string | null;
};

type TeamRow = {
  id: string;
  name: string | null;
  owner_email: string | null;
  team_clearance_tier: string | null;
};

type TeamOwnedRow = {
  id: string;
  subject_name?: string | null;
  candidate_name?: string | null;
  file_name?: string | null;
  subject_type?: string | null;
  trust_score?: number | null;
  review_status?: string | null;
  verification_status?: string | null;
  status?: string | null;
  scan_status?: string | null;
  decision?: string | null;
};

type SignalRow = {
  id: string;
  event: string;
  created_at: string | null;
};

async function fetchTeamRows<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  teamId: string,
  select = "*",
  limit = 6
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (error) return { rows: [] as T[], available: false };

  return { rows: data ?? [], available: true };
}

function statusClass(status: string | null | undefined) {
  if (["active", "verified", "ready", "approved"].includes(status ?? "")) {
    return "border-emerald-700 text-emerald-200";
  }
  if (["rejected", "revoked", "restricted", "escalated"].includes(status ?? "")) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

function SmallList({
  title,
  rows,
  fallback,
}: {
  title: string;
  rows: TeamOwnedRow[];
  fallback: TeamOwnedRow[];
}) {
  const data = rows.length ? rows : fallback;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">
        {data.map((item) => {
          const name =
            item.subject_name ??
            item.candidate_name ??
            item.file_name ??
            item.decision ??
            "Team item";
          const status =
            item.review_status ??
            item.verification_status ??
            item.status ??
            item.scan_status ??
            "pending";

          return (
            <div
              key={item.id}
              className="rounded-lg border border-zinc-800 bg-black p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-100">{name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.subject_type ?? "team"} / Trust{" "}
                    {item.trust_score ?? "n/a"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function TeamWorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: memberships, error: membersError } = await supabase
    .from("team_members")
    .select("id,team_id,member_email,role,invitation_status")
    .eq("member_email", user.email)
    .limit(1)
    .returns<TeamMember[]>();
  const teamId = memberships?.[0]?.team_id ?? "demo-team";
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,name,owner_email,team_clearance_tier")
    .eq("id", teamId)
    .limit(1)
    .returns<TeamRow[]>();
  const [passports, cases, reports, evidence, signals, apiKeys, decisions] =
    await Promise.all([
      fetchTeamRows<TeamOwnedRow>(
        supabase,
        "passports",
        teamId,
        "id,subject_name,subject_type,trust_score,review_status,team_id,created_at"
      ),
      fetchTeamRows<TeamOwnedRow>(
        supabase,
        "verification_cases",
        teamId,
        "id,subject_name,verification_status,status,trust_score,team_id,created_at"
      ),
      fetchTeamRows<TeamOwnedRow>(
        supabase,
        "trust_reports",
        teamId,
        "id,candidate_name,review_status,trust_score,team_id,created_at"
      ),
      fetchTeamRows<TeamOwnedRow>(
        supabase,
        "evidence_files",
        teamId,
        "id,file_name,scan_status,team_id,created_at"
      ),
      fetchTeamRows<SignalRow>(
        supabase,
        "signals",
        teamId,
        "id,event,team_id,created_at",
        8
      ),
      fetchTeamRows<{ id: string; usage_count: number | null }>(
        supabase,
        "api_keys",
        teamId,
        "id,usage_count,team_id,created_at"
      ),
      fetchTeamRows<TeamOwnedRow>(
        supabase,
        "decisions",
        teamId,
        "id,decision,status,team_id,created_at"
      ),
    ]);
  const isDemo = Boolean(membersError || teamsError || !teams?.length);
  const members = membersError || !memberships?.length ? demoTeamMembers : memberships;
  const teamName = teams?.[0]?.name ?? demoTeamSummary.team_name;
  const apiCallsUsed =
    apiKeys.rows.reduce((sum, key) => sum + (key.usage_count ?? 0), 0) || 1284;
  const metrics = [
    ["Team Trust Score", demoTeamSummary.team_trust_score],
    ["Open Cases", cases.rows.length || demoTeamSummary.open_cases],
    ["Pending Reviews", decisions.rows.length || demoTeamSummary.pending_reviews],
    ["Reports Ready", reports.rows.length || demoTeamReports.length],
    ["API Calls Used", apiCallsUsed],
    ["Evidence Pending", evidence.rows.length || demoTeamEvidence.length],
    ["Active Members", members.length || demoTeamSummary.active_members],
    ["Current Plan", teams?.[0]?.team_clearance_tier ?? demoTeamSummary.current_plan],
  ];

  await createSignal(supabase, "team_workspace_opened");
  await createAuditLog(supabase, "team_workspace_accessed", user.email, {
    source: "team_workspace",
    team_id: teamId,
    demo_fallback: isDemo,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/team-access", "Team Access"],
            ["/verifier-network", "Verifier Network"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/client-portal", "Client Portal"],
            ["/verification-queue", "Verification Queue"],
            ["/developer-console", "Developer Console"],
            ["/billing", "Billing"],
            ["/admin", "Admin"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Team operations
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Team Workspace&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust operations for teams verifying humans, AI agents, candidates
            and synthetic media.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">
            Approved reviewers from the Verifier Network can support team case
            review and escalation workflows.
          </p>
          <Link
            href="/team-access"
            className="mt-5 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Manage Team Access
          </Link>
          {isDemo ? (
            <p className="mt-3 text-sm text-zinc-600">
              Showing demo team workspace until teams and team_members tables
              include {futureTeamFields.join(", ")}.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Team Overview</h2>
            <p className="mt-4 text-3xl font-semibold">{teamName}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {teams?.[0]?.owner_email ?? user.email} /{" "}
              {teams?.[0]?.team_clearance_tier ?? demoTeamSummary.current_plan}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {teamPermissions.map((permission) => (
                <code
                  key={permission}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {permission}
                </code>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Members</h2>
            <div className="mt-5 space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {member.member_email ?? "team member"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {member.invitation_status ?? "active"}
                      </p>
                    </div>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                      {member.role ?? "viewer"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {teamRoles.map((role) => (
                <code
                  key={role}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {role}
                </code>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <SmallList
            title="Team Passports"
            rows={passports.rows}
            fallback={demoTeamPassports}
          />
          <SmallList
            title="Verification Cases"
            rows={cases.rows}
            fallback={demoTeamCases}
          />
          <SmallList
            title="Candidate Reports"
            rows={reports.rows}
            fallback={demoTeamReports}
          />
          <SmallList
            title="Evidence Requests"
            rows={evidence.rows}
            fallback={demoTeamEvidence}
          />
          <SmallList
            title="Admin Decisions"
            rows={decisions.rows}
            fallback={demoTeamDecisions}
          />

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Team Trust Seals</h2>
            <div className="mt-5 space-y-3">
              {[
                "Team Trust Seal",
                "Evidence Chain Verified Seal",
                "Company Trust Seal",
              ].map((seal) => (
                <div
                  key={seal}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{seal}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Team seal placeholder
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/trust-seal-authority"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seals
            </Link>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Team Trust Badges</h2>
            <div className="mt-5 space-y-3">
              {[
                "Verified Agent",
                "Origin Trace Checked",
                "Evidence Chain Verified",
              ].map((badge) => (
                <div
                  key={badge}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{badge}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Team badge placeholder
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Team Signals</h2>
            <div className="mt-5 space-y-3">
              {signals.rows.length
                ? signals.rows.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal.event}</p>
                    </div>
                  ))
                : teamWorkspaceSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal}</p>
                    </div>
                  ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
