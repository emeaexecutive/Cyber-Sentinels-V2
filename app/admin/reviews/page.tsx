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

type OriReviewInference = {
  inference_id: string;
  trust_session_id: string;
  model_version: string;
  score: number;
  risk_band: string;
  recommendation: string;
  abstain: boolean;
  confidence_band: string;
  comparison_category: string;
  missing_feature_ids: string[];
  explanation_summary: { top_factors?: Array<{ featureId: string; direction: string; contribution: number; explanation: string }>; evidence_coverage?: number; limitations?: string[] } | null;
  inferred_at: string;
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
  const { data: oriInferences, error: oriError } = await adminSupabase
    .from("ori_inference_records")
    .select("inference_id,trust_session_id,model_version,score,risk_band,recommendation,abstain,confidence_band,comparison_category,missing_feature_ids,explanation_summary,inferred_at")
    .is("latest_reviewer_outcome_id", null)
    .order("inferred_at", { ascending: false })
    .limit(100);
  const oriRows = (oriInferences ?? []) as OriReviewInference[];

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

        <section className="mt-8 rounded-lg border border-amber-900/70 bg-amber-950/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Operational Risk Intelligence · Shadow mode</p>
          <h2 className="mt-2 text-xl font-semibold">ORI recommendation review</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Review ORI usefulness and caution separately from the authoritative Trust Decision. Outcomes are immutable and remain ineligible for future datasets until governance approval; no online learning occurs.
          </p>
          {oriError ? <p className="mt-4 text-sm text-amber-200">Awaiting the Sprint 16.1A migration; no ORI review state is inferred.</p> : null}
          <div className="mt-5 grid gap-3">
            {oriRows.length ? oriRows.map((item) => (
              <article key={item.inference_id} className="rounded-lg border border-zinc-800 bg-black p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Model {item.model_version} · Trust session {item.trust_session_id}</p>
                    <p className="mt-2 font-medium text-zinc-100">{item.risk_band} · {item.recommendation}</p>
                    <p className="mt-2 text-sm text-zinc-500">Score {item.score.toFixed(3)} · {item.confidence_band} confidence · {item.comparison_category}</p>
                    <p className="mt-1 text-xs text-zinc-600">Missing features: {item.missing_feature_ids.length ? item.missing_feature_ids.join(", ") : "none"}. Evidence coverage: {Math.round((item.explanation_summary?.evidence_coverage ?? 0) * 100)}%.</p>
                  </div>
                  <StatusBadge status={item.abstain ? "abstained" : "shadow"} />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-zinc-500">
                  {(item.explanation_summary?.top_factors ?? []).slice(0, 3).map((factor) => (
                    <p key={factor.featureId}>{factor.featureId}: {factor.direction.toLowerCase().replaceAll("_", " ")} ({factor.contribution.toFixed(3)})</p>
                  ))}
                </div>
                <form action="/api/admin/reviews" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="ori_inference_id" value={item.inference_id} />
                  <select name="ori_outcome" required defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <option value="" disabled>Reviewer outcome</option>
                    <option value="CORRECT">Correct</option><option value="TOO_CAUTIOUS">Too cautious</option><option value="NOT_CAUTIOUS_ENOUGH">Not cautious enough</option><option value="NOT_USEFUL">Not useful</option>
                  </select>
                  <select name="usefulness" required defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <option value="" disabled>Usefulness</option>
                    <option value="USEFUL">Useful</option><option value="PARTIALLY_USEFUL">Partially useful</option><option value="NOT_USEFUL">Not useful</option>
                  </select>
                  <select name="explanation_sufficiency" required defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <option value="" disabled>Explanation sufficiency</option>
                    <option value="SUFFICIENT">Sufficient</option><option value="PARTIAL">Partial</option><option value="INSUFFICIENT">Insufficient</option>
                  </select>
                  <select name="caution_alignment" required defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <option value="" disabled>Caution alignment</option>
                    <option value="APPROPRIATE">Appropriate</option><option value="TOO_CAUTIOUS">Too cautious</option><option value="NOT_CAUTIOUS_ENOUGH">Not cautious enough</option><option value="NOT_COMPARABLE">Not comparable</option>
                  </select>
                  <select name="expected_class" defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm">
                    <option value="">Expected class not approved</option><option value="CAUTION">Caution</option><option value="NO_CAUTION">No caution</option>
                  </select>
                  <input name="notes" maxLength={2000} placeholder="Permitted reviewer note (no secrets or raw identity evidence)" className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" />
                  <button className="rounded-lg border border-amber-800 px-3 py-2 text-sm text-amber-200 md:col-span-2">Record immutable ORI review</button>
                </form>
              </article>
            )) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">No unreviewed ORI shadow records are available. No records were fabricated.</p>
            )}
          </div>
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
