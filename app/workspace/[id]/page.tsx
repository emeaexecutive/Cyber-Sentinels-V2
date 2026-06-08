import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  buildReviewQueue,
  casePriorities,
  caseStatuses,
  formatWorkspaceDate,
  statusClass,
  workspaceMetrics,
  type CaseRelationshipRow,
  type TrustCaseRow,
  type WorkspaceMemberRow,
  type WorkspaceRow,
} from "@/lib/trust-workspace/workspace";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createCase(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/workspace");

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "open");
  const priority = String(formData.get("priority") ?? "medium");

  if (!uuidPattern.test(workspaceId) || !title) {
    redirect(`/workspace/${workspaceId}?case_error=missing_fields`);
  }

  await supabase.from("trust_cases").insert({
    workspace_id: workspaceId,
    title,
    description,
    status,
    priority,
    created_by: user.id,
  });

  redirect(`/workspace/${workspaceId}`);
}

async function linkCaseRelationship(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/workspace");

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const caseId = String(formData.get("case_id") ?? "");
  const targetType = String(formData.get("target_type") ?? "passport").trim();
  const targetId = String(formData.get("target_id") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();

  if (!uuidPattern.test(workspaceId) || !uuidPattern.test(caseId) || !uuidPattern.test(targetId)) {
    redirect(`/workspace/${workspaceId}?relationship_error=invalid_uuid`);
  }

  await supabase.from("trust_case_relationships").insert({
    case_id: caseId,
    target_type: targetType,
    target_id: targetId,
    relationship_type: "linked_to",
    explanation: explanation || "Workspace case link created for operational governance review.",
    created_by: user.id,
  });

  redirect(`/workspace/${workspaceId}`);
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

function CaseCard({ item }: { item: TrustCaseRow }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-100">{item.title ?? "Trust case"}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {item.description ?? "No case description recorded."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(item.status)}`}>
            {item.status ?? "open"}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(item.priority)}`}>
            {item.priority ?? "medium"}
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-600">
        Created {formatWorkspaceDate(item.created_at)}
      </p>
    </div>
  );
}

function RowList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: AnyRow[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
          {rows.length}
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div key={String(row.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="font-medium text-zinc-100">
                {String(row.event_title ?? row.event_type ?? row.event ?? row.target_type ?? "Workspace record")}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {String(row.event_summary ?? row.explanation ?? row.status ?? "Operational record preserved for review.")}
              </p>
              <p className="mt-3 text-xs text-zinc-600">
                {formatWorkspaceDate(row.created_at)}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

export default async function WorkspaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ case_error?: string; relationship_error?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/workspace/${encodeURIComponent(id)}`);

  const { data: workspace } = await supabase
    .from("trust_workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle<WorkspaceRow>();

  if (!workspace) notFound();

  const [members, cases, relationships, signals, evidence, timeline, auditLogs] = await Promise.all([
    fetchRows<WorkspaceMemberRow>(supabase, "workspace_members", 200),
    fetchRows<TrustCaseRow>(supabase, "trust_cases", 200),
    fetchRows<CaseRelationshipRow>(supabase, "trust_case_relationships", 200),
    fetchRows<AnyRow>(supabase, "signals", 80),
    fetchRows<AnyRow>(supabase, "evidence_files", 80),
    fetchRows<AnyRow>(supabase, "trust_timeline_events", 120),
    fetchRows<AnyRow>(supabase, "audit_logs", 120),
  ]);
  const scopedMembers = members.filter((item) => item.workspace_id === id);
  const scopedCases = cases.filter((item) => item.workspace_id === id);
  const caseIds = new Set(scopedCases.map((item) => item.id));
  const scopedRelationships = relationships.filter((item) =>
    item.case_id ? caseIds.has(item.case_id) : false
  );
  const scopedTimeline = timeline.filter((item) =>
    item.subject_type === "trust_case" && item.subject_id ? caseIds.has(String(item.subject_id)) : false
  );
  const scopedAuditLogs = auditLogs.filter((item) => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    return metadata.workspace_id === id || (metadata.trust_case_id ? caseIds.has(String(metadata.trust_case_id)) : false);
  });
  const metrics = workspaceMetrics(scopedCases, scopedMembers);
  const reviewQueue = buildReviewQueue({ cases: scopedCases, signals, evidence });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          {[
            ["/workspace", "Workspaces"],
            ["/verification-queue", "Verification Queue"],
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
            Operational workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            {workspace.name ?? "Trust workspace"}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            {workspace.description ??
              "Collaborative trust operations for verification workflows, governance reviews, escalations and audit visibility."}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            AI-assisted workspace summaries can later describe operational
            state, unresolved risks and governance bottlenecks. Humans decide.
          </p>
        </section>

        {query.case_error || query.relationship_error ? (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-100">
            The workspace action could not be completed. Check required fields and UUID values.
          </div>
        ) : null}

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Active Cases", metrics.activeCases],
            ["In Review", metrics.inReview],
            ["Escalations", metrics.escalations],
            ["Members", metrics.members],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Create Trust Case</h2>
            <form action={createCase} className="mt-5 grid gap-4">
              <input type="hidden" name="workspace_id" value={id} />
              <input
                name="title"
                placeholder="Case title"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <textarea
                name="description"
                placeholder="Operational context"
                className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <select name="status" defaultValue="open" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                  {caseStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <select name="priority" defaultValue="medium" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                  {casePriorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <button className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
                Create Case
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
                  No pending reviews, unresolved signals or escalations are visible.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active Cases</h2>
            <div className="mt-5 grid gap-3">
              {scopedCases.length ? (
                scopedCases.map((item) => <CaseCard key={item.id} item={item} />)
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No cases yet. Create one to coordinate review, escalation and governance work.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Link Case Record</h2>
            <form action={linkCaseRelationship} className="mt-5 grid gap-4">
              <input type="hidden" name="workspace_id" value={id} />
              <select name="case_id" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                {scopedCases.map((item) => (
                  <option key={item.id} value={item.id}>{item.title ?? item.id}</option>
                ))}
              </select>
              <select name="target_type" defaultValue="passport" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                {["passport", "evidence", "signal", "timeline_event", "agent", "governance_review"].map((target) => (
                  <option key={target} value={target}>{target}</option>
                ))}
              </select>
              <input
                name="target_id"
                placeholder="Linked record UUID"
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <textarea
                name="explanation"
                placeholder="Why this record belongs to the case"
                className="min-h-24 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
              <button className="w-fit rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
                Link Record
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <RowList
            title="Case Relationships"
            rows={scopedRelationships}
            empty="No case relationships yet."
          />
          <RowList
            title="Trust Timeline"
            rows={scopedTimeline}
            empty="No case timeline events yet."
          />
          <RowList
            title="Audit Visibility"
            rows={scopedAuditLogs}
            empty="No case audit activity yet."
          />
        </section>
      </div>
    </main>
  );
}
