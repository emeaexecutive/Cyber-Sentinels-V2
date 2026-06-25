import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildReviewQueue,
  formatWorkspaceDate,
  slugifyWorkspaceName,
  statusClass,
  workspaceMetrics,
  type TrustCaseRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/trust-workspace/workspace";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

async function createWorkspace(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/workspace");

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) redirect("/workspace?workspace_error=missing_name");

  const slug = `${slugifyWorkspaceName(name)}-${Date.now().toString(36)}`;
  const { data: workspace } = await supabase
    .from("trust_workspaces")
    .insert({
      name,
      slug,
      description,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (workspace?.id) {
    await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "admin",
    });
    redirect(`/workspace/${workspace.id}`);
  }

  redirect("/workspace?workspace_error=create_failed");
}

async function fetchRows<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 100
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

function WorkspaceCard({
  workspace,
  cases,
  members,
}: {
  workspace: WorkspaceRow;
  cases: TrustCaseRow[];
  members: WorkspaceMemberRow[];
}) {
  const scopedCases = cases.filter((item) => item.workspace_id === workspace.id);
  const scopedMembers = members.filter((item) => item.workspace_id === workspace.id);
  const metrics = workspaceMetrics(scopedCases, scopedMembers);

  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">
            {workspace.name ?? "Trust workspace"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {workspace.description ?? "Operational trust workflows and governance review."}
          </p>
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
          {workspace.slug ?? "workspace"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["Active", metrics.activeCases],
          ["In Review", metrics.inReview],
          ["Escalated", metrics.escalations],
          ["Members", metrics.members],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-800 bg-black p-3">
            <p className="text-xs text-zinc-600">{label}</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{ workspace_error?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/workspace");

  const [workspaces, members, cases, signals, evidence] = await Promise.all([
    fetchRows<WorkspaceRow>(supabase, "trust_workspaces", 80),
    fetchRows<WorkspaceMemberRow>(supabase, "workspace_members", 200),
    fetchRows<TrustCaseRow>(supabase, "trust_cases", 200),
    fetchRows<AnyRow>(supabase, "signals", 80),
    fetchRows<AnyRow>(supabase, "evidence_files", 80),
  ]);
  const visibleWorkspaceIds = new Set([
    ...workspaces.filter((item) => item.created_by === user.id).map((item) => item.id),
    ...members.filter((item) => item.user_id === user.id).map((item) => String(item.workspace_id)),
  ]);
  const visibleWorkspaces = workspaces.filter((item) => visibleWorkspaceIds.has(item.id));
  const visibleCases = cases.filter((item) => !item.workspace_id || visibleWorkspaceIds.has(item.workspace_id));
  const reviewQueue = buildReviewQueue({ cases: visibleCases, signals, evidence });
  const metrics = workspaceMetrics(visibleCases, members.filter((item) => visibleWorkspaceIds.has(String(item.workspace_id))));

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          {[
            ["/", "Home"],
            ["/verification-queue", "Verification Queue"],
            ["/dashboard/governance", "Governance"],
            ["/timeline", "Timeline"],
            ["/trust-replay", "Replay"],
            ["/back-office", "Back Office"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Trust workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Operational trust case management
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps organizations operationalize explainable trust
            workflows across verification, governance reviews, escalations,
            audit visibility and trust operations.
          </p>
        </section>

        {query.workspace_error ? (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            Workspace could not be created. Check the name and try again.
          </div>
        ) : null}

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Workspaces", visibleWorkspaces.length],
            ["Active Cases", metrics.activeCases],
            ["Review Queue", reviewQueue.length],
            ["Escalations", metrics.escalations],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Workspace</h2>
            <form action={createWorkspace} className="mt-5 grid gap-4">
              <input
                name="name"
                placeholder="Workspace name"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <textarea
                name="description"
                placeholder="Operational purpose"
                className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <button className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Create Workspace
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Review Queue</h2>
            <div className="mt-5 grid gap-3">
              {reviewQueue.length ? (
                reviewQueue.map((item) => (
                  <Link key={item.id} href={item.href} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">{item.title}</p>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{item.reason}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No pending review items are visible right now.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4">
          {visibleWorkspaces.length ? (
            visibleWorkspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                cases={visibleCases}
                members={members}
              />
            ))
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-black p-5 text-sm leading-7 text-zinc-500">
              No trust workspaces yet. Create one to group cases, passports,
              agents, reviews and governance workflows.
            </div>
          )}
        </section>

        <p className="mt-8 text-xs text-zinc-600">
          Last checked {formatWorkspaceDate(new Date().toISOString())}
        </p>
      </div>
    </main>
  );
}
