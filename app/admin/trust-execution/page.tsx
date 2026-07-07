import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReplayRow = {
  id: string;
  event_type: string | null;
  event_title: string | null;
  event_summary: string | null;
  subject_id: string | null;
  severity: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
};

export default async function TrustExecutionAdminPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login?next=/admin/trust-execution");
    redirect("/back-office?denied=1");
  }
  await requireAdminPageAccess(supabase, { path: "/admin/trust-execution" });
  const { data } = await supabase
    .from("trust_timeline_events")
    .select("id,event_type,event_title,event_summary,subject_id,severity,metadata,created_at")
    .ilike("event_type", "%trust_workflow%")
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ReplayRow[]>();
  const rows = data ?? [];
  const count = (needle: string) => rows.filter((row) => String(row.metadata?.decision ?? row.event_type).includes(needle)).length;
  const summary = [
    ["Recent trust decisions", rows.length],
    ["Allowed actions", count("allow")],
    ["Blocked actions", count("block")],
    ["Escalations", count("escalate")],
    ["Step-up requests", count("step_up")],
    ["Evidence preserved", rows.filter((row) => row.metadata?.evidence_preserved === true).length],
  ];

  return (
    <main className="operational-shell min-h-screen px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="operational-panel p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <h1 className="mt-4 text-4xl font-semibold">Trust Execution Monitor</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-400">
            Monitor algorithm results, workflow execution, evidence preservation,
            replay links and detection source labels. Empty rows mean no retained
            execution events are visible, not that no risk exists.
          </p>
          <Link href="/demo/trust-execution-flow" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            Open execution demo
          </Link>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {summary.map(([label, value]) => (
            <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Sources</th>
                  <th className="px-4 py-3">Replay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-black">
                {rows.length ? rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-4 font-medium text-zinc-100">{String(row.metadata?.decision ?? row.event_title ?? "decision")}</td>
                    <td className="px-4 py-4 text-zinc-400">{String(row.metadata?.action_executed ?? row.event_summary ?? "not recorded")}</td>
                    <td className="px-4 py-4 text-zinc-400">{String(row.metadata?.confidence_band ?? "not recorded")}</td>
                    <td className="px-4 py-4 text-zinc-400">{Array.isArray(row.metadata?.source_labels) ? row.metadata.source_labels.join(", ") : "not recorded"}</td>
                    <td className="px-4 py-4">
                      <Link href={`/trust-replay?subject_id=${encodeURIComponent(row.subject_id ?? "")}`} className="text-cyan-200 hover:text-cyan-100">
                        View Replay
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="px-4 py-6 text-zinc-500" colSpan={5}>No trust execution events retained yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
