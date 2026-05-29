import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import { demoTeamMembers } from "@/lib/trust-engine/teamWorkspace";
import {
  canApproveDecision,
  canInviteMember,
  canManageBilling,
  canViewEvidence,
  demoInvitations,
  getRolePermissions,
  invitationStatuses,
  teamAccessAuditEvents,
  teamAccessPermissions,
  teamAccessRoles,
  teamAccessSignals,
  type TeamAccessRole,
} from "@/lib/team/accessControl";

export const dynamic = "force-dynamic";

type TeamMember = {
  id: string;
  member_email: string | null;
  role: string | null;
  invitation_status: string | null;
};

type SignalRow = {
  id: string;
  event: string;
  created_at: string | null;
};

function statusClass(status: string | null | undefined) {
  if (["accepted", "active"].includes(status ?? "")) {
    return "border-emerald-700 text-emerald-200";
  }
  if (["expired", "revoked"].includes(status ?? "")) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

export default async function TeamAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=/command-center");
  }

  const [{ data: members, error: membersError }, { data: signals }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id,member_email,role,invitation_status")
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<TeamMember[]>(),
      supabase
        .from("signals")
        .select("id,event,created_at")
        .or("event.ilike.%team_invite%,event.ilike.%team_role%")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<SignalRow[]>(),
    ]);
  const activeMembers = membersError || !members?.length ? demoTeamMembers : members;
  const currentRole = activeMembers.find(
    (member) => member.member_email === user.email
  )?.role ?? "owner";

  await createSignal(supabase, "team_workspace_opened");
  await createAuditLog(supabase, "team_access_changed", user.email, {
    source: "team_access",
    role: currentRole,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/team-workspace", "Team Workspace"],
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
            Team governance
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Team Access Control
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Invite members, assign roles and prepare permission controls for
            team trust operations.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Invite Member</h2>
            <form action="/api/team/invite" method="POST" className="mt-5 space-y-3">
              <input
                name="email"
                type="email"
                required
                placeholder="teammate@example.com"
                className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none"
              />
              <select
                name="role"
                className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-3 text-sm text-white outline-none"
                defaultValue="reviewer"
              >
                {teamAccessRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
                Create invite placeholder
              </button>
            </form>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Email delivery is not enabled yet. Invites are API-ready
              placeholders.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Role Permissions</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {teamAccessRoles.map((role) => (
                <div
                  key={role}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{role}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getRolePermissions(role).map((permission) => (
                      <code
                        key={`${role}-${permission}`}
                        className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
                      >
                        {permission}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending Invitations</h2>
            <div className="mt-5 space-y-3">
              {demoInvitations.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">{invite.email}</p>
                      <p className="mt-1 text-sm text-zinc-500">{invite.role}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                        invite.invitation_status
                      )}`}
                    >
                      {invite.invitation_status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active Members</h2>
            <div className="mt-5 space-y-3">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {member.member_email ?? "team member"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {member.role ?? "viewer"} /{" "}
                    {member.invitation_status ?? "active"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Access Events</h2>
            <div className="mt-5 space-y-3">
              {signals?.length
                ? signals.map((signal) => (
                    <div
                      key={signal.id}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal.event}</p>
                    </div>
                  ))
                : teamAccessSignals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <p className="text-zinc-300">{signal}</p>
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Security Notes</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
              <p>Future invites must verify team_id ownership before creation.</p>
              <p>Role changes should always create audit log entries.</p>
              <p>Team access should be enforced with Supabase RLS policies.</p>
              <p>
                Current role: {currentRole}. Invite:{" "}
                {canInviteMember(currentRole) ? "allowed" : "blocked"} /
                approve:{" "}
                {canApproveDecision(currentRole) ? "allowed" : "blocked"} /
                billing: {canManageBilling(currentRole) ? "allowed" : "blocked"} /
                evidence: {canViewEvidence(currentRole) ? "allowed" : "blocked"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Access Vocabulary</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {teamAccessPermissions.map((permission) => (
                <code
                  key={permission}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {permission}
                </code>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {invitationStatuses.map((status) => (
                <span
                  key={status}
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {teamAccessAuditEvents.map((event) => (
                <code
                  key={event}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {event}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
