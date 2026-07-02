import Link from "next/link";
import { TrustRadarRefresh } from "@/components/trust-radar-refresh";
import { createClient } from "@/lib/supabase/server";
import {
  calculateRadarMetrics,
  formatTimeAgo,
  normalizeSignals,
  type PassportSignalStats,
  type RadarSeverity,
  type RadarStatus,
  type SignalRow,
} from "@/lib/trust-engine/liveSignals";

export const dynamic = "force-dynamic";

const severityStyles: Record<RadarSeverity, string> = {
  low: "border-emerald-800 text-emerald-200",
  medium: "border-cyan-800 text-cyan-200",
  high: "border-amber-800 text-amber-200",
  critical: "border-red-800 text-red-200",
};

const statusStyles: Record<RadarStatus, string> = {
  pending: "text-zinc-400",
  investigating: "text-amber-200",
  verified: "text-emerald-200",
  critical: "text-red-200",
};

export default async function TrustRadarPage() {
  const supabase = await createClient();

  const [{ data: signalRows }, { data: passports }] = await Promise.all([
    supabase
      .from("signals")
      .select("id,event,created_at")
      .order("created_at", { ascending: false })
      .limit(18)
      .returns<SignalRow[]>(),
    supabase
      .from("passports")
      .select("human_presence_index,origin_trace_score,review_status")
      .returns<PassportSignalStats[]>(),
  ]);

  const signals = normalizeSignals(signalRows);
  const metrics = calculateRadarMetrics(signals, passports);
  const usingDemoSignals = signals.some((signal) => signal.isDemo);

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <TrustRadarRefresh />
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /
          </Link>
          <Link href="/command-center" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /command-center
          </Link>
          <Link href="/back-office" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            Back Office
          </Link>
        </nav>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-teal-200">
              Proof before permission in motion.
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl md:text-6xl">
              Live Trust Radar™
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-400">
              Live Trust Radar visualises real-time trust events across humans,
              AI agents, synthetic media, candidate verification and Reality
              Passports.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-300">
              System Status
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.9)]" />
              <p className="text-2xl font-semibold text-emerald-100">
                Trust Layer Active
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-emerald-100/70">
              Auto-refreshing every 12 seconds. Newest signals are ordered at
              the top of the radar stream.
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Signals Today", metrics.signalsToday],
            ["Critical Alerts", metrics.criticalAlerts],
            ["Pending Reviews", metrics.pendingReviews],
            ["Average HPI™", metrics.averageHumanPresenceIndex],
            ["Average Origin Trace", metrics.averageOriginTrace],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            "Signal detected",
            "Trust state changed",
            "Reality status updated",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Trust Vocabulary
              </p>
              <p className="mt-3 text-xl font-semibold">{item}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Trust Signal Stream</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Signal detected / Trust state changed / Reality status updated
              </p>
            </div>
            {usingDemoSignals ? (
              <span className="w-fit rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">
                Demo Signal
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3">
            {signals.map((signal, index) => (
              <article
                key={signal.id}
                className={`rounded-lg border border-zinc-800 bg-black p-4 ${
                  index === 0 ? "animate-pulse" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {signal.isDemo ? (
                        <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                          Demo Signal
                        </span>
                      ) : null}
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${severityStyles[signal.severity]}`}>
                        {signal.severity}
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-medium">{signal.event}</p>
                    <p className="mt-2 text-sm text-zinc-500">{signal.visual}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm text-zinc-500">{formatTimeAgo(signal.created_at)}</p>
                    <p className={`mt-2 rounded-full border border-zinc-800 px-2.5 py-1 text-sm font-medium ${statusStyles[signal.status]}`}>
                      {signal.status}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-zinc-900 pt-4 text-sm text-zinc-500 sm:grid-cols-3">
                  <p>event: {signal.event}</p>
                  <p>source_type: {signal.source_type}</p>
                  <p>created_at: {new Date(signal.created_at).toLocaleString()}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
