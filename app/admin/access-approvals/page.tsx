import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const editableStatuses = ["APPROVED", "REJECTED", "SUSPENDED", "REVOKED"] as const;
type EditableStatus = (typeof editableStatuses)[number];

type ApprovalRow = {
  user_id: string;
  email: string;
  organization: string | null;
  status: string;
  requested_at: string;
  approved_at: string | null;
  approved_by: string | null;
  denied_at: string | null;
  denied_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  last_login_attempt: string | null;
  last_successful_login: string | null;
  reason: string | null;
};

type ApprovalEventRow = {
  id: string;
  user_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

async function updateAccessApproval(formData: FormData) {
  "use server";

  const authClient = await createClient();
  const admin = await requireAdminPageAccess(authClient, {
    path: "/admin/access-approvals",
    action: "update_account_access_approval",
  });
  const userId = String(formData.get("user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as EditableStatus;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000) || null;

  if (!userId || !editableStatuses.includes(status)) return;
  if (status === "APPROVED" && userId === admin.id) {
    throw new Error("Platform administrators cannot approve their own account.");
  }

  const now = new Date().toISOString();
  const change: Record<string, string | null> = { status, reason };
  if (status === "APPROVED") {
    change.approved_at = now;
    change.approved_by = admin.id;
  } else if (status === "REJECTED") {
    change.rejected_at = now;
    change.rejected_by = admin.id;
  } else if (status === "SUSPENDED") {
    change.suspended_at = now;
    change.suspended_by = admin.id;
  } else if (status === "REVOKED") {
    change.revoked_at = now;
    change.revoked_by = admin.id;
  }

  const { error } = await createServiceRoleClient()
    .from("account_access_approvals")
    .update(change)
    .eq("user_id", userId);

  if (error) throw new Error("Could not update account access approval.");
  revalidatePath("/admin/access-approvals");
  revalidatePath("/back-office");
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

export default async function AccessApprovalsPage() {
  const authClient = await createClient();
  const admin = await requireAdminPageAccess(authClient, { path: "/admin/access-approvals" });
  if (!admin) redirect("/back-office?denied=1");

  const adminClient = createServiceRoleClient();
  const { data, error } = await adminClient
    .from("account_access_approvals")
    .select("user_id,email,organization,status,requested_at,approved_at,approved_by,denied_at,denied_by,rejected_at,rejected_by,suspended_at,suspended_by,revoked_at,revoked_by,last_login_attempt,last_successful_login,reason")
    .order("requested_at", { ascending: false })
    .limit(200)
    .returns<ApprovalRow[]>();
  const approvalUserIds = (data ?? []).map((approval) => approval.user_id);
  const eventResult = approvalUserIds.length
    ? await adminClient.from("account_access_approval_events")
      .select("id,user_id,event_type,actor_user_id,reason,metadata,created_at")
      .in("user_id", approvalUserIds)
      .order("created_at", { ascending: false })
      .limit(1000)
      .returns<ApprovalEventRow[]>()
    : { data: [] as ApprovalEventRow[], error: null };
  const eventsByUser = new Map<string, ApprovalEventRow[]>();
  for (const event of eventResult.data ?? []) {
    if (!event.user_id) continue;
    eventsByUser.set(event.user_id, [...(eventsByUser.get(event.user_id) ?? []), event]);
  }

  return (
    <main className="min-h-screen bg-black px-5 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Platform administration</p>
            <h1 className="mt-2 text-2xl font-semibold">Account access approvals</h1>
          </div>
          <Link href="/back-office" className="border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-400">Back Office</Link>
        </header>

        {error || eventResult.error ? (
          <p role="alert" className="mt-6 border-l-2 border-red-500 pl-4 text-sm text-red-200">Approval records are unavailable.</p>
        ) : (
          <div className="mt-6 divide-y divide-zinc-800">
            {(data ?? []).map((approval) => (
              <article key={approval.user_id} className="grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-medium">{approval.email}</h2>
                    <span className="border border-zinc-700 px-2 py-1 text-xs text-zinc-300">{approval.status}</span>
                  </div>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-zinc-400 sm:grid-cols-2">
                    <div><dt className="text-zinc-600">Organization</dt><dd>{approval.organization ?? "Not provided"}</dd></div>
                    <div><dt className="text-zinc-600">Requested</dt><dd>{formatDate(approval.requested_at)}</dd></div>
                    <div><dt className="text-zinc-600">Last login attempt</dt><dd>{formatDate(approval.last_login_attempt)}</dd></div>
                    <div><dt className="text-zinc-600">Last successful login</dt><dd>{formatDate(approval.last_successful_login)}</dd></div>
                    <div><dt className="text-zinc-600">Approved</dt><dd>{formatDate(approval.approved_at)}</dd></div>
                    <div><dt className="text-zinc-600">Rejected / suspended / revoked</dt><dd>{formatDate(approval.rejected_at ?? approval.denied_at ?? approval.suspended_at ?? approval.revoked_at)}</dd></div>
                  </dl>
                  {approval.reason ? <p className="mt-3 text-sm text-zinc-500">Reason: {approval.reason}</p> : null}
                  <details className="mt-4 border-t border-zinc-800 pt-3">
                    <summary className="cursor-pointer text-xs text-zinc-400">Access audit history ({eventsByUser.get(approval.user_id)?.length ?? 0})</summary>
                    <ol className="mt-3 space-y-3 border-l border-zinc-800 pl-3">
                      {(eventsByUser.get(approval.user_id) ?? []).map((event) => (
                        <li key={event.id} className="text-xs">
                          <p className="text-zinc-200">{event.event_type.replaceAll("_", " ")}</p>
                          <p className="mt-1 text-zinc-500">{formatDate(event.created_at)} UTC · Actor {event.actor_user_id ?? "deleted/anonymized"}</p>
                          {event.reason ? <p className="mt-1 text-zinc-400">{event.reason}</p> : null}
                          {Object.keys(event.metadata ?? {}).length ? <p className="mt-1 break-all text-zinc-600">{JSON.stringify(event.metadata)}</p> : null}
                        </li>
                      ))}
                      {!eventsByUser.get(approval.user_id)?.length ? <li className="text-xs text-zinc-500">No access events recorded.</li> : null}
                    </ol>
                  </details>
                </div>

                <form action={updateAccessApproval} className="flex flex-col gap-3 border-l border-zinc-800 pl-4 sm:flex-row sm:items-end">
                  <input type="hidden" name="user_id" value={approval.user_id} />
                  <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-400">
                    Set status
                    <select name="status" defaultValue={approval.status === "PENDING" ? "APPROVED" : approval.status} className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white">
                      {editableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-400">
                    Reason
                    <input name="reason" defaultValue={approval.reason ?? ""} maxLength={1000} className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
                  </label>
                  <button type="submit" className="border border-emerald-800 px-3 py-2 text-sm text-emerald-200 hover:border-emerald-500">Update</button>
                </form>
              </article>
            ))}
            {!data?.length && !error ? <p className="py-8 text-sm text-zinc-500">No account requests.</p> : null}
          </div>
        )}
      </div>
    </main>
  );
}