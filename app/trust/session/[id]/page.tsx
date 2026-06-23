import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SessionSignalCards } from "@/components/session-integrity";
import type { ExplainableSessionSignal } from "@/lib/session-integrity/model";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SessionTrustPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/trust/session/${encodeURIComponent(id)}`);

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id,title,status,session_status,integrity_status,candidate_id,candidate_profile_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  const [{ data: check }, { data: signalRows }, { data: governanceActions }] = await Promise.all([
    supabase.from("session_integrity_checks").select("*").eq("interview_session_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("verification_signals").select("*").eq("interview_session_id", id).order("created_at", { ascending: false }),
    supabase.from("governance_actions").select("action_status,resolution_notes,resolved_at,created_at").eq("subject_type", "interview_session").eq("subject_id", id).order("created_at", { ascending: false }).limit(1),
  ]);

  const latestCheckId = check?.id ? String(check.id) : null;
  const signals = (signalRows ?? [])
    .filter((row) => !latestCheckId || String(row.session_integrity_check_id) === latestCheckId)
    .map((row) => ({
      category: row.category,
      label: String(row.category ?? "signal").replaceAll("_", " "),
      status: row.signal_status,
      risk_level: row.risk_level,
      confidence_score: row.confidence_score,
      explanation: row.explanation,
      badge: row.badge_label,
      requires_manual_review: Boolean(row.requires_manual_review),
    })) as ExplainableSessionSignal[];
  const humanDecision = governanceActions?.[0];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Session Trust Review</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{session.title ?? `Session ${id}`}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Identity verification, liveness, deepfake risk, injection risk and session integrity are separate review states. A verified candidate can still have channel integrity evidence or verification flags that require manual review.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Identity verification state", check?.identity_verification_state ?? "pending"],
            ["Session integrity state", check?.overall_status ?? "pending"],
            ["Human review decision", humanDecision?.action_status ?? (check?.manual_review_required ? "required" : "pending")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
              <p className="mt-2 text-lg font-semibold text-zinc-100">{String(value).replaceAll("_", " ")}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold">Separate verification signals</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Each state is explainable and reviewable. Liveness alone does not establish identity, hiring integrity, continuous trust posture or overall trust.
          </p>
          <div className="mt-5">
            {signals.length ? <SessionSignalCards signals={signals} /> : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400">No session integrity review has been recorded yet.</p>}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/verify/session" className="text-cyan-200 underline">Record another review</Link>
          <Link href={`/trust/hiring-report/${id}`} className="text-cyan-200 underline">Open hiring trust report</Link>
        </div>
      </div>
    </main>
  );
}

