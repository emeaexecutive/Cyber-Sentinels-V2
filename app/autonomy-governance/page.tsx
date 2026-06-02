import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type AutonomyGovernancePageProps = {
  searchParams?: Promise<{ created?: string }>;
};

type MetricResult = {
  table: string;
  label: string;
  count: number;
  available: boolean;
};

const autonomyLevels = [
  [
    "Observe",
    "The agent or workflow can read assigned context and surface live state without recommending action.",
  ],
  [
    "Advise",
    "The system can interpret signals and recommend decisions while execution stays with a human owner.",
  ],
  [
    "Act with Approval",
    "The workflow can prepare or stage actions, but a reviewer must approve before execution.",
  ],
  [
    "Act Autonomously",
    "The agent can execute within an approved scope, with continuous logging and signal monitoring.",
  ],
];

const metricTables = [
  ["intent_requests", "Intent Requests"],
  ["decisions", "Decisions"],
  ["audit_logs", "Audit Events"],
  ["signals", "Signals"],
];

async function liveCount(table: string, label: string): Promise<MetricResult> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  return {
    table,
    label,
    count: count ?? 0,
    available: !error,
  };
}

async function createAutonomyProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/autonomy-governance");
  }

  const subjectName = String(formData.get("subject_name") ?? "").trim();
  const subjectType = String(formData.get("subject_type") ?? "").trim();
  const autonomyLevel = String(formData.get("autonomy_level") ?? "").trim();
  const riskLevel = String(formData.get("risk_level") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const approvalRequired = formData.get("approval_required") === "on";

  if (!subjectName) {
    redirect("/autonomy-governance");
  }

  const actor = user.email ?? user.id;
  const { data: profile, error } = await supabase
    .from("autonomy_profiles")
    .insert({
      subject_name: subjectName,
      subject_type: subjectType || "workflow",
      autonomy_level: autonomyLevel || "Observe",
      approval_required: approvalRequired,
      risk_level: riskLevel || "medium",
      notes: notes || null,
      created_by: actor,
    })
    .select("id")
    .single();

  if (!error) {
    const graphMetadata = {
      autonomy_profile_id: profile?.id,
      subject_name: subjectName,
      subject_type: subjectType || "workflow",
      autonomy_level: autonomyLevel || "Observe",
      approval_required: approvalRequired,
      risk_level: riskLevel || "medium",
      actor,
    };

    await createAuditLog(
      supabase,
      "autonomy_profile_created",
      actor,
      graphMetadata
    );
    await createSignal(supabase, "Autonomy profile created", graphMetadata);
  }

  redirect("/autonomy-governance?created=1");
}

export default async function AutonomyGovernancePage({
  searchParams,
}: AutonomyGovernancePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metrics = await Promise.all(
    metricTables.map(([table, label]) => liveCount(table, label))
  );
  const metricsUnavailable = metrics.some((metric) => !metric.available);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Autonomy Governance
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Autonomy Governance Engine&trade;
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Cyber Sentinels maps what an agent or workflow is allowed to
                observe, advise, approve or execute.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Autonomy requires governance.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/intent-verification"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                View Intent Layer
              </Link>
              <Link
                href="/mission-control"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                Open Mission Control
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Autonomy Levels
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {autonomyLevels.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Governance Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live control signals across delegated action.
              </h2>
            </div>
            {metricsUnavailable ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.table}
                className="rounded-lg border border-zinc-800 bg-black p-5"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {metric.label}
                </p>
                <p className="mt-4 text-3xl font-semibold text-zinc-100">
                  {metric.available ? metric.count : "n/a"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                Create Autonomy Profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Define what a subject is allowed to do.
              </h2>
            </div>
          </div>
          {params?.created === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Autonomy profile created.
            </p>
          ) : null}
          {user ? (
            <form action={createAutonomyProfile} className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-400">
                Subject name
                <input
                  name="subject_name"
                  required
                  placeholder="Agent, workflow or service name"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Subject type
                <input
                  name="subject_type"
                  placeholder="agent, workflow, approval chain"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Autonomy level
                <select
                  name="autonomy_level"
                  defaultValue="Observe"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  {autonomyLevels.map(([level]) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Risk level
                <select
                  name="risk_level"
                  defaultValue="medium"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-400 lg:col-span-2">
                <input
                  name="approval_required"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-cyan-300"
                />
                Approval required before execution
              </label>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Scope limits, escalation rules or reviewer context"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 lg:w-fit"
              >
                Create Autonomy Profile
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                Sign in to create autonomy profiles and record the audit trail.
              </p>
              <Link
                href="/login?next=/autonomy-governance"
                className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
              >
                Sign in
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
