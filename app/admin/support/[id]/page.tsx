import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type SupportIssue = {
  id: string;
  issue_type: string;
  summary: string;
  details: string | null;
  current_route: string;
  workflow_id: string | null;
  workflow_state: string | null;
  replay_reference: string | null;
  provider_state: string | null;
  auth_state: string | null;
  trust_posture_state: string | null;
  session_reference: string;
  browser_metadata: Record<string, unknown>;
  build_version: string | null;
  screenshot_storage_path: string | null;
  screenshot_file_name: string | null;
  status: string;
  admin_notes: string | null;
  verification_notes: string | null;
  submitted_by_email: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not supplied";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: `/admin/support/${id}` });

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("support_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const issue = data as SupportIssue | null;
  if (!issue) notFound();

  const screenshotUrl = issue.screenshot_storage_path
    ? (await admin.storage.from("support-screenshots").createSignedUrl(issue.screenshot_storage_path, 900)).data?.signedUrl ?? null
    : null;
  const replayHref = issue.replay_reference
    ? issue.replay_reference.startsWith("/")
      ? issue.replay_reference
      : `/replay/${encodeURIComponent(issue.replay_reference)}`
    : null;

  const diagnostics = [
    ["Current route", issue.current_route],
    ["Workflow ID", issue.workflow_id],
    ["Workflow state", issue.workflow_state],
    ["Replay reference", issue.replay_reference],
    ["Provider state", issue.provider_state],
    ["Auth state", issue.auth_state],
    ["Trust posture", issue.trust_posture_state],
    ["Session reference", issue.session_reference],
    ["Build version", issue.build_version],
    ["Submitted by", issue.submitted_by_email],
    ["Submitted at", new Date(issue.created_at).toLocaleString()],
  ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin/support" className="text-sm text-cyan-200 underline">
          Back to support queue
        </Link>
        <section className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">
            {issue.issue_type.replaceAll("_", " ")}
          </p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">{issue.summary}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
                {issue.details || "No additional description was supplied."}
              </p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs capitalize">
              {issue.status.replaceAll("_", " ")}
            </span>
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Screenshot</h2>
            {screenshotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={screenshotUrl} alt="User-submitted support screenshot" className="mt-4 max-h-[620px] w-full rounded-lg border border-zinc-800 object-contain" />
            ) : (
              <p className="mt-4 text-sm text-zinc-400">No screenshot was attached.</p>
            )}
            {issue.screenshot_file_name ? <p className="mt-3 text-xs text-zinc-500">{issue.screenshot_file_name}</p> : null}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <h2 className="text-xl font-semibold">Workflow diagnostics</h2>
            <dl className="mt-4 grid gap-3">
              {diagnostics.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <dt className="text-xs uppercase tracking-[0.1em] text-zinc-500">{label}</dt>
                  <dd className="mt-1 break-words text-sm text-zinc-200">{display(value)}</dd>
                </div>
              ))}
            </dl>
            {replayHref ? (
              <Link href={replayHref} className="mt-4 inline-flex rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100">
                Inspect replay
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Browser and device metadata</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(issue.browser_metadata ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">{key.replaceAll("_", " ")}</p>
                <p className="mt-1 break-words text-sm text-zinc-200">{display(value)}</p>
              </div>
            ))}
          </div>
        </section>

        <form action={`/api/admin/support/${issue.id}`} method="post" className="mt-6 grid gap-4 rounded-lg border border-zinc-800 bg-black p-5">
          <h2 className="text-xl font-semibold">Issue state and fix verification</h2>
          <label className="grid gap-2 text-sm text-zinc-300">
            Status
            <select name="status" defaultValue={issue.status} className="rounded-lg border border-zinc-700 bg-zinc-950 p-3">
              {["new", "triaged", "in_progress", "fix_ready", "verified", "closed"].map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            Admin notes
            <textarea name="admin_notes" rows={4} defaultValue={issue.admin_notes ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 p-3" />
          </label>
          <label className="grid gap-2 text-sm text-zinc-300">
            Fix verification
            <textarea name="verification_notes" rows={3} defaultValue={issue.verification_notes ?? ""} className="rounded-lg border border-zinc-700 bg-zinc-950 p-3" />
          </label>
          <button className="w-fit rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-zinc-950">
            Save support review
          </button>
        </form>
      </div>
    </main>
  );
}

