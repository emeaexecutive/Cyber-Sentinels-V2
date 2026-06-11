import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RunRow = {
  id: string;
  subject_type: string;
  subject_id: string;
  score: number | null;
  confidence_level: string | null;
  positive_signals: string[] | null;
  negative_signals: string[] | null;
  missing_requirements: string[] | null;
  recommended_action: string | null;
  explanation: string | null;
  created_at: string | null;
};

const additiveRules = [
  ["+15", "Verified passport"],
  ["+10", "Evidence completeness"],
  ["+10", "Human governance decision"],
  ["+10", "Audit trail exists"],
  ["+5", "Operational signals exist"],
  ["+5", "No unresolved appeal"],
  ["+5", "Workflow relationship data exists"],
  ["+5", "Provenance signal present"],
  ["+5", "Timeline or replay history present"],
];

const subtractiveRules = [
  ["-20", "Rejected/denied decision"],
  ["-15", "Missing evidence"],
  ["-10", "Manual review required"],
  ["-10", "Unresolved appeal"],
  ["-10", "High-risk signal"],
  ["-10", "Unverified AI agent"],
  ["-15", "Suspicious/unknown agent activity"],
];

const confidenceBands = [
  ["80-100", "High Trust"],
  ["60-79", "Verified with Review"],
  ["40-59", "In Review"],
  ["0-39", "Elevated Risk"],
];

const examples = [
  "This subject has a strong trust chain because evidence, governance decisions, signals, timelines and audit logs are present.",
  "This subject requires human review because evidence, provenance or governance context is missing.",
];

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function list(values?: string[] | null) {
  return values?.length ? values.join(", ") : "None recorded";
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function TrustAlgorithmPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: runs } = user
    ? await supabase
        .from("trust_algorithm_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<RunRow[]>()
    : { data: [] as RunRow[] };

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Algorithm V1
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-6xl">
            Explainable trust orchestration
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-400">
            Deterministic rules combine provenance signals, workflow integrity,
            session continuity, evidence completeness, governance review,
            reviewer actions, escalation patterns and trust history. No
            black-box AI decisioning is used.
          </p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <Panel title="Core Formula">
            <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
              Trust state = evidence + governance + timelines + signals +
              reviewer context - unresolved risk
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              Base score starts at 50 and clamps between 0 and 100.
            </p>
          </Panel>

          <Panel title="Confidence">
            <div className="grid gap-3">
              {confidenceBands.map(([band, label]) => (
                <div key={band} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black p-3">
                  <span className="text-sm text-zinc-500">{band}</span>
                  <span className="text-sm font-medium text-zinc-100">{label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Supported Subjects">
            <div className="grid gap-3 text-sm text-zinc-300">
              <Link href="/passports" className="rounded-lg border border-zinc-800 bg-black p-3 hover:border-cyan-800">
                Human and candidate passports
              </Link>
              <Link href="/agents" className="rounded-lg border border-zinc-800 bg-black p-3 hover:border-cyan-800">
                AI agents and agent activity
              </Link>
            </div>
          </Panel>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Positive Rules">
            <div className="grid gap-3">
              {additiveRules.map(([points, label]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-emerald-900/70 bg-black p-3">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-sm font-semibold text-emerald-200">{points}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Risk Rules">
            <div className="grid gap-3">
              {subtractiveRules.map(([points, label]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-rose-900/70 bg-black p-3">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-sm font-semibold text-rose-200">{points}</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel title="Explanation Examples">
          <div className="grid gap-3 md:grid-cols-2">
            {examples.map((example) => (
              <p key={example} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                {example}
              </p>
            ))}
          </div>
        </Panel>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Latest Runs</h2>
          <div className="mt-5 grid gap-3">
            {(runs ?? []).length ? (
              (runs ?? []).map((run) => (
                <article key={run.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-zinc-100">
                        {run.subject_type} / {run.subject_id}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{formatDate(run.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{run.score ?? "n/a"}</p>
                      <p className="text-sm text-cyan-200">{run.confidence_level ?? "Not classified"}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">
                    {run.explanation ?? "No explanation recorded."}
                  </p>
                  <div className="mt-4 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
                    <p>Positive: {list(run.positive_signals)}</p>
                    <p>Risk: {list(run.negative_signals)}</p>
                    <p>Missing: {list(run.missing_requirements)}</p>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">
                    {run.recommended_action ?? "No action recorded."}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No trust algorithm runs are visible yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
