import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveReview(formData: FormData) {
  "use server";
  const { user, workspace, role } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/reviews");
  if (!workspace || !["owner", "admin", "reviewer"].includes(String(role))) redirect("/dashboard/reviews?error=REVIEW_FORBIDDEN");
  const reviewId = String(formData.get("review_id") ?? "");
  const resolution = String(formData.get("resolution") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const evidenceReference = String(formData.get("evidence_reference") ?? "").trim();
  if (!uuid.test(reviewId) || !["APPROVED", "REJECTED"].includes(resolution) || !reason || reason.length > 1000 || !evidenceReference || evidenceReference.length > 240) {
    redirect("/dashboard/reviews?error=INVALID_REVIEW_RESOLUTION");
  }
  const result = await createServiceRoleClient().rpc("resolve_canonical_manual_review_v1", {
    p_tenant_id: workspace.id,
    p_reviewer_user_id: user.id,
    p_expected_client_id: null,
    p_review_id: reviewId,
    p_resolution: resolution,
    p_reason: reason,
    p_evidence_reference: evidenceReference,
    p_correlation_id: crypto.randomUUID(),
  });
  if (result.error) redirect("/dashboard/reviews?error=REVIEW_RESOLUTION_UNAVAILABLE");
  redirect("/dashboard/reviews?updated=1");
}

export default async function CanonicalReviewsPage({ searchParams }: { searchParams?: Promise<{ error?: string; updated?: string }> }) {
  const query = searchParams ? await searchParams : {};
  const { user, workspace, role } = await resolveIdentityUiEnterprise();
  if (!user) redirect("/login?next=/dashboard/reviews");
  if (!workspace) return <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">An enterprise workspace is required.</main>;
  const result = await createServiceRoleClient().from("trust_manual_reviews")
    .select("id,status,reason,entity_id,original_transaction_id,requested_client_id,assigned_to,reviewer_principal_id,decision,decision_reason,evidence_reference,correlation_id,expires_at,completed_at,created_at")
    .eq("tenant_id", workspace.id).not("original_transaction_id", "is", null).order("created_at", { ascending: false }).limit(100);
  const rows = result.data ?? [];
  const canResolve = ["owner", "admin", "reviewer"].includes(String(role));
  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">V1 governed human review</p><h1 className="mt-3 text-4xl font-semibold">Canonical review console</h1><p className="mt-4 max-w-3xl text-zinc-400">Resolutions append reviewer history and a REVIEW_RESOLVED transaction event. The original canonical decision remains REVIEW; approval requires a new evaluation before execution.</p>
    {query.updated ? <p className="mt-5 rounded-lg border border-emerald-900 p-4 text-emerald-200">Review resolution recorded in the canonical lifecycle.</p> : null}{query.error ? <p role="alert" className="mt-5 rounded-lg border border-rose-900 p-4 text-rose-200">The review was not changed: {query.error}</p> : null}{result.error ? <p role="alert" className="mt-5 rounded-lg border border-rose-900 p-4 text-rose-200">Canonical reviews are temporarily unavailable. No legacy queue has been substituted.</p> : null}
    <section className="mt-8 grid gap-4">{rows.map((review) => { const open = ["REQUESTED", "IN_REVIEW"].includes(String(review.status)); return <article key={review.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">Review {review.id}</p><p className="mt-2 text-sm text-zinc-400">Operational Entity {review.entity_id}</p></div><span className="rounded-full border border-zinc-700 px-3 py-1 text-xs">{review.status}</span></div><dl className="mt-4 grid gap-2 text-xs text-zinc-500 md:grid-cols-2"><div>Original transaction: {review.original_transaction_id}</div><div>Requested client: {review.requested_client_id}</div><div>Assigned reviewer: {review.assigned_to ?? "Unassigned"}</div><div>Expires: {review.expires_at ? new Date(review.expires_at).toLocaleString() : "Not recorded"}</div></dl><p className="mt-3 text-sm text-zinc-400">Reason: {review.reason ?? "Not recorded"}</p>{review.original_transaction_id ? <Link className="mt-3 inline-block text-sm text-cyan-200" href={`/trust/transactions/${review.original_transaction_id}`}>Open original decision</Link> : null}{open && canResolve ? <form action={resolveReview} className="mt-5 grid gap-3 rounded-lg border border-zinc-800 bg-black p-4"><input type="hidden" name="review_id" value={review.id}/><label className="grid gap-1 text-xs text-zinc-400">Resolution<select name="resolution" className="rounded border border-zinc-700 bg-zinc-950 p-2"><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label className="grid gap-1 text-xs text-zinc-400">Reason<textarea required maxLength={1000} name="reason" className="min-h-20 rounded border border-zinc-700 bg-zinc-950 p-2"/></label><label className="grid gap-1 text-xs text-zinc-400">Existing evidence reference<input required maxLength={240} name="evidence_reference" placeholder="evidence:<canonical-reference>" className="rounded border border-zinc-700 bg-zinc-950 p-2"/></label><button className="rounded bg-white px-4 py-2 text-sm font-semibold text-black">Record governed resolution</button></form> : null}{open && !canResolve ? <p className="mt-4 text-xs text-amber-200">Your workspace role is read-only for review resolution.</p> : null}</article>; })}{!result.error && !rows.length ? <p className="rounded-lg border border-dashed border-zinc-700 p-6 text-zinc-500">No canonical V1 reviews are stored for this workspace.</p> : null}</section>
    <section className="mt-8 rounded-lg border border-amber-900/60 bg-amber-950/10 p-5"><p className="font-semibold text-amber-200">Historical review records</p><p className="mt-2 text-sm text-zinc-400">Pre-V1 verification and model-review queues are separate historical workflows and never resolve a canonical V1 REVIEW.</p><Link href="/admin/reviews" className="mt-3 inline-block text-sm text-amber-200">Open historical review archive</Link></section>
  </div></main>;
}
