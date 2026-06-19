import Link from "next/link";
import { redirect } from "next/navigation";
import { SessionIntegrityBadge } from "@/components/session-integrity";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SessionIntegrityDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/session-integrity");

  const [{ data: checks }, { data: signals }] = await Promise.all([
    supabase.from("session_integrity_checks").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("verification_signals").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const rows = checks ?? [];
  const signalRows = signals ?? [];
  const manualReviews = rows.filter((row) => row.manual_review_required).length;
  const channelFailures = signalRows.filter((row) => row.category === "device_channel_integrity" && row.signal_status === "failed").length;
  const injectionFlags = signalRows.filter((row) => row.category === "injection_risk" && ["medium", "high"].includes(String(row.risk_level))).length;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Session Integrity</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Session Integrity Review Dashboard</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Review liveness, deepfake risk, injection risk, device and channel
            integrity, and session anomaly flags as separate evidence. Human
            reviewers retain the decision.
          </p>
          <Link href="/verify/session" className="mt-5 inline-flex rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Record session review</Link>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4">
          {[
            ["Session reviews", rows.length],
            ["Manual reviews", manualReviews],
            ["Channel failures", channelFailures],
            ["Injection flags", injectionFlags],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-2xl font-semibold">Recent session reviews</h2>
          <div className="mt-5 grid gap-3">
            {rows.length ? rows.map((check) => (
              <Link key={String(check.id)} href={`/trust/session/${check.interview_session_id}`} className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">Session {String(check.interview_session_id)}</p>
                    <p className="mt-2 text-sm text-zinc-400">Identity: {check.identity_verification_state ?? "pending"} / Session: {check.overall_status ?? "pending"}</p>
                  </div>
                  <SessionIntegrityBadge label={check.manual_review_required ? "Manual Review Required" : "Session Review Pending"} />
                </div>
              </Link>
            )) : <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-400">No session integrity checks recorded yet.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

