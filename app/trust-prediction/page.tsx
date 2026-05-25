import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  predictTrustRisk,
  type PredictionInputAuditLog,
  type PredictionInputDecision,
  type PredictionInputPassport,
  type PredictionInputSignal,
  type PredictionState,
} from "@/lib/trust-engine/predictions";

export const dynamic = "force-dynamic";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const stateStyles: Record<PredictionState, string> = {
  stable: "border-emerald-800 text-emerald-200",
  watch: "border-cyan-800 text-cyan-200",
  elevated: "border-amber-800 text-amber-200",
  critical: "border-red-800 text-red-200",
};

async function fetchRows<T>(
  supabase: SupabaseServerClient,
  table: string,
  select: string,
  limit = 30
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  return error ? [] : data ?? [];
}

export default async function TrustPredictionPage() {
  const supabase = await createClient();

  const [passports, signals, auditLogs, decisions] = await Promise.all([
    fetchRows<PredictionInputPassport>(
      supabase,
      "passports",
      "trust_score,human_presence_index,origin_trace_score,synthetic_risk,voice_clone_risk,video_deepfake_risk,review_status,linkedin_verification_status"
    ),
    fetchRows<PredictionInputSignal>(supabase, "signals", "event,created_at"),
    fetchRows<PredictionInputAuditLog>(
      supabase,
      "audit_logs",
      "event_type,created_at"
    ),
    fetchRows<PredictionInputDecision>(
      supabase,
      "decisions",
      "decision,status,created_at"
    ),
  ]);

  const prediction = predictTrustRisk({
    passports,
    signals,
    auditLogs,
    decisions,
  });

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /
          </Link>
          <Link href="/command-center" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /command-center
          </Link>
          <Link href="/admin" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /admin
          </Link>
          <Link href="/reality-chain" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /reality-chain
          </Link>
          <Link href="/human-presence-genome" className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">
            /human-presence-genome
          </Link>
        </nav>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-rose-200">
              Trust decay often starts before humans notice.
            </p>
            <h1 className="mt-4 text-5xl font-semibold md:text-7xl">
              Trust Prediction Engine™
            </h1>
            {prediction.isDemo ? (
              <p className="mt-5 w-fit rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">
                Demo prediction
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-500">Prediction Score</p>
            <p className="mt-3 text-6xl font-semibold">{prediction.score}</p>
            <span className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${stateStyles[prediction.state]}`}>
              {prediction.state}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Risk Direction</h2>
            <p className="mt-4 text-3xl font-semibold capitalize">
              {prediction.riskDirection}
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trend</h2>
            <p className="mt-4 text-zinc-300">{prediction.trend}</p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:col-span-2">
            <h2 className="text-xl font-semibold">Reality Drift Signal Input</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Reality Drift events from Origin DNA and Reality Chain are treated
              as forecast signals when origin confidence drops or transformation
              history changes.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:col-span-2">
            <h2 className="text-xl font-semibold">HPG Signal Input</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Human Presence Genome shifts are treated as prediction inputs when
              behavioral stability drops or synthetic deviation rises.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Contributing Factors</h2>
            <div className="mt-5 space-y-3">
              {prediction.factors.map((factor) => (
                <p key={factor} className="rounded-lg border border-zinc-800 bg-black p-4 text-zinc-300">
                  {factor}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Trust Changes</h2>
            <div className="mt-5 space-y-3">
              {prediction.recentTrustChanges.map((change) => (
                <p key={change} className="rounded-lg border border-zinc-800 bg-black p-4 text-zinc-300">
                  {change}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recommended Actions</h2>
            <div className="mt-5 space-y-3">
              {prediction.recommendedActions.map((action) => (
                <p key={action} className="rounded-lg border border-zinc-800 bg-black p-4 text-zinc-300">
                  {action}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Forecast Signals</h2>
            <div className="mt-5 space-y-3">
              {prediction.signals.map((signal) => (
                <p key={signal} className="rounded-lg border border-zinc-800 bg-black p-4 text-zinc-300">
                  {signal}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
