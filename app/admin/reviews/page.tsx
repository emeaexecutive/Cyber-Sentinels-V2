import { StatusBadge } from "@/components/phase-one-trust";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type ReviewEvent = {
  id: string;
  subject_type: string | null;
  status: string | null;
  risk_level: string | null;
  notes: string | null;
  created_at: string | null;
};

type ValidationReviewCase = {
  case_id: string;
  dataset_version: string;
  entity_type: string;
  workflow: string;
  expected_outcome: string;
  actual_outcome: string | null;
  review_status: string;
  source_provenance: string;
  usage_boundary: string;
  evidence_references: string[];
  limitations: string[];
  input_evidence: unknown;
  review_mode: "single" | "dual";
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; updated?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/admin/reviews" });

  const adminSupabase = createServiceRoleClient();
  const { data: events, error } = await adminSupabase
    .from("verification_events")
    .select("id,subject_type,status,risk_level,notes,created_at")
    .in("status", ["pending", "needs_manual_review"])
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (events ?? []) as ReviewEvent[];
  const { data: validationCases, error: validationError } = await adminSupabase
    .from("release_validation_cases")
    .select("case_id,dataset_version,entity_type,workflow,expected_outcome,actual_outcome,review_status,source_provenance,usage_boundary,evidence_references,limitations,input_evidence,review_mode")
    .in("review_status", ["pending", "reviewed", "disputed"])
    .order("created_at", { ascending: true })
    .limit(100);
  const validationRows = (validationCases ?? []) as ValidationReviewCase[];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Governance Review Queue
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            Verification Events Awaiting Review
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Review pending candidate, recruiter and interview integrity events.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-900/70 bg-cyan-950/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">RC6 controlled validation</p>
          <h2 className="mt-2 text-xl font-semibold">Ground-truth review</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Only cases explicitly approved here can enter Release 1.0 precision, recall or calibration metrics.
            Approval requires attributable rationale, confidence and retained evidence references.
          </p>
          {validationError ? (
            <p className="mt-4 text-sm text-amber-200">Awaiting the RC6 migration; no validation approval is inferred.</p>
          ) : null}
          <div className="mt-5 grid gap-3">
            {validationRows.length ? validationRows.map((item) => (
              <article key={item.case_id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{item.dataset_version} · {item.workflow}</p>
                    <p className="mt-2 font-medium text-zinc-100">{item.case_id}</p>
                    <p className="mt-2 text-sm text-zinc-500">Expected {item.expected_outcome}; actual {item.actual_outcome ?? "Awaiting Data"}. Source: {item.source_provenance}.</p>
                    <p className="mt-1 text-xs text-zinc-600">Usage boundary: {item.usage_boundary}. Evidence references: {item.evidence_references.length}.</p>
                    <p className="mt-1 text-xs text-zinc-600">Review protocol: {item.review_mode === "dual" ? "Two distinct reviewers required" : "Single accountable reviewer"}.</p>
                    <pre className="mt-3 max-h-40 overflow-auto rounded border border-zinc-900 bg-zinc-950 p-3 text-xs text-zinc-500">{JSON.stringify(item.input_evidence, null, 2)}</pre>
                  </div>
                  <StatusBadge status={item.review_status} />
                </div>
                <form action="/api/admin/reviews" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="validation_case_id" value={item.case_id} />
                  <input name="ground_truth_label" placeholder="Ground-truth label" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" />
                  <input name="review_confidence" type="number" min="0" max="1" step="0.01" required placeholder="Confidence 0–1" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" />
                  <input name="uncertainty" placeholder="Uncertainty (optional)" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" />
                  <input name="disagreement" placeholder="Disagreement (optional)" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" />
                  <input name="notes" required placeholder="Reviewer rationale" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm md:col-span-2" />
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button name="status" value="reviewed" className="rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-200">Record review</button>
                    <button name="status" value="disputed" className="rounded-lg border border-amber-800 px-3 py-2 text-sm text-amber-200">Dispute</button>
                    <button name="status" value="approved" className="rounded-lg border border-emerald-800 px-3 py-2 text-sm text-emerald-200">Approve</button>
                    <button name="status" value="excluded" className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-200">Exclude</button>
                  </div>
                </form>
              </article>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No controlled validation cases are awaiting review. No cases were fabricated.</p>
            )}
          </div>
        </section>

        {error ? (
          <p className="mt-8 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            Admin review queue could not be loaded.
          </p>
        ) : null}
        {query.error ? (
          <p className="mt-8 rounded-lg border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">
            Governance Review was recorded, but the source verification event
            could not be updated. Reconcile the event before treating the workflow as resolved.
          </p>
        ) : null}

        <section className="mt-8 grid gap-3">
          {rows.length ? rows.map((event) => (
            <article key={event.id} className="rounded-lg border border-zinc-800 bg-black p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{event.subject_type}</p>
                  <p className="mt-2 font-medium">{event.id}</p>
                  {event.notes ? <p className="mt-2 text-sm text-zinc-500">{event.notes}</p> : null}
                </div>
                <StatusBadge status={event.risk_level ?? event.status ?? "pending"} />
              </div>
              <form action="/api/admin/reviews" method="post" className="mt-4 flex flex-wrap gap-3">
                <input type="hidden" name="verification_event_id" value={event.id} />
                <input
                  name="notes"
                  placeholder="Reviewer rationale or evidence note"
                  className="min-w-0 flex-1 basis-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 sm:basis-72"
                />
                <button name="status" value="approved" className="rounded-lg border border-emerald-800 px-3 py-2 text-sm text-emerald-200">Approve</button>
                <button name="status" value="needs_manual_review" className="rounded-lg border border-amber-800 px-3 py-2 text-sm text-amber-200">Needs Review</button>
                <button name="status" value="rejected" className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-200">Reject</button>
              </form>
            </article>
          )) : (
            <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
              No verification events are waiting for review.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
