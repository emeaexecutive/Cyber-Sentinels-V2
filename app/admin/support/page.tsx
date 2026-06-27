import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type SupportIssue = {
  id: string;
  issue_type: string;
  summary: string;
  current_route: string;
  workflow_id: string | null;
  replay_reference: string | null;
  status: string;
  submitted_by_email: string | null;
  screenshot_storage_path: string | null;
  created_at: string;
};

function format(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminSupportPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/support" });

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("support_issues")
    .select("id,issue_type,summary,current_route,workflow_id,replay_reference,status,submitted_by_email,screenshot_storage_path,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const issues = (data ?? []) as SupportIssue[];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
            Admin support
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Screenshot review queue</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Review consented screenshots, route context and workflow diagnostics.
            Reports contain operational debugging data only.
          </p>
        </section>

        {error ? (
          <p className="mt-6 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            The support queue could not be loaded.
          </p>
        ) : null}

        <section className="mt-8 grid gap-3">
          {issues.length ? issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/admin/support/${issue.id}`}
              className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">
                    {format(issue.issue_type)}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{issue.summary}</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    {issue.current_route} · {issue.submitted_by_email ?? "Authenticated user"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(issue.created_at).toLocaleString()} · {issue.screenshot_storage_path ? "Screenshot attached" : "No screenshot"}
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs capitalize text-zinc-200">
                  {format(issue.status)}
                </span>
              </div>
            </Link>
          )) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-400">
              No support issues have been submitted.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

