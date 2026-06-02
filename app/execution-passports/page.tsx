import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type ExecutionPassportsPageProps = {
  searchParams?: Promise<{ created?: string }>;
};

type MetricResult = {
  table: string;
  label: string;
  count: number;
  available: boolean;
};

type PassportOption = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
};

type IntentOption = {
  id: string;
  intent_summary: string | null;
  risk_level: string | null;
};

const governancePillars = [
  ["Identity", "Bind execution to a verified Trust Passport subject."],
  ["Intent", "Require a stated purpose before sensitive action moves forward."],
  ["Evidence", "Attach proof before authority expands or execution begins."],
  ["Approval", "Keep human review in front of high-risk execution."],
  ["Audit Trail", "Record every request, signal and decision for review."],
];

const metricTables = [
  ["passports", "Passports"],
  ["intent_requests", "Intent Requests"],
  ["autonomy_profiles", "Autonomy Profiles"],
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

function passportLabel(passport: PassportOption) {
  return [passport.subject_name, passport.subject_type, passport.id]
    .filter(Boolean)
    .join(" / ");
}

function intentLabel(intent: IntentOption) {
  return [intent.intent_summary, intent.risk_level, intent.id]
    .filter(Boolean)
    .join(" / ");
}

async function createExecutionPassport(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/execution-passports");
  }

  const passportId = String(formData.get("passport_id") ?? "").trim();
  const intentId = String(formData.get("intent_id") ?? "").trim();
  const executionSummary = String(formData.get("execution_summary") ?? "").trim();
  const executionType = String(formData.get("execution_type") ?? "").trim();
  const riskLevel = String(formData.get("risk_level") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const approvalRequired = formData.get("approval_required") === "on";
  const evidenceRequired = formData.get("evidence_required") === "on";

  if (!passportId || !executionSummary) {
    redirect("/execution-passports");
  }

  const actor = user.email ?? user.id;
  const { data: executionPassport, error } = await supabase
    .from("execution_passports")
    .insert({
      passport_id: passportId,
      intent_id: intentId || null,
      execution_summary: executionSummary,
      execution_type: executionType || "workflow_action",
      risk_level: riskLevel || "medium",
      approval_required: approvalRequired,
      evidence_required: evidenceRequired,
      status: status || "pending_review",
      notes: notes || null,
      created_by: actor,
    })
    .select("id")
    .single();

  if (!error) {
    const graphMetadata = {
      execution_passport_id: executionPassport?.id,
      passport_id: passportId,
      intent_id: intentId || null,
      execution_summary: executionSummary,
      execution_type: executionType || "workflow_action",
      risk_level: riskLevel || "medium",
      approval_required: approvalRequired,
      evidence_required: evidenceRequired,
      status: status || "pending_review",
      actor,
    };

    await createAuditLog(
      supabase,
      "execution_passport_created",
      actor,
      graphMetadata
    );
    await createSignal(supabase, "Execution passport created", graphMetadata);
  }

  redirect("/execution-passports?created=1");
}

export default async function ExecutionPassportsPage({
  searchParams,
}: ExecutionPassportsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [metrics, { data: passports }, { data: intents }] = await Promise.all([
    Promise.all(metricTables.map(([table, label]) => liveCount(table, label))),
    supabase
      .from("passports")
      .select("id,subject_name,subject_type")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PassportOption[]>(),
    supabase
      .from("intent_requests")
      .select("id,intent_summary,risk_level")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<IntentOption[]>(),
  ]);
  const passportOptions = passports ?? [];
  const intentOptions = intents ?? [];
  const metricsUnavailable = metrics.some((metric) => !metric.available);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Execution Governance
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Execution Passport&trade;
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Cyber Sentinels links high-risk actions to evidence, approval,
                intent and audit history before execution.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                No high-risk execution without evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/passport"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
              >
                Create Trust Passport
              </Link>
              <Link
                href="/passports"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                View Trust Passports
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Execution Governance Overview
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {governancePillars.map(([title, copy]) => (
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
                Execution Passport Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Evidence-backed authorization before execution.
              </h2>
            </div>
            {metricsUnavailable ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
                Create Execution Request
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Every high-risk action needs a passport.
              </h2>
            </div>
          </div>
          {params?.created === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              Execution passport created.
            </p>
          ) : null}
          {user ? (
            <form
              action={createExecutionPassport}
              className="mt-5 grid gap-4 lg:grid-cols-2"
            >
              <label className="grid gap-2 text-sm text-zinc-400">
                Passport
                <select
                  name="passport_id"
                  required
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="">Select a Trust Passport</option>
                  {passportOptions.map((passport) => (
                    <option key={passport.id} value={passport.id}>
                      {passportLabel(passport)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Intent
                <select
                  name="intent_id"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="">No intent linked</option>
                  {intentOptions.map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intentLabel(intent)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Execution summary
                <input
                  name="execution_summary"
                  required
                  placeholder="Describe the high-risk action before execution"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Execution type
                <input
                  name="execution_type"
                  placeholder="workflow_action, access_change, agent_execution"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
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
              <label className="grid gap-2 text-sm text-zinc-400">
                Status
                <select
                  name="status"
                  defaultValue="pending_review"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="pending_review">pending_review</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="executed">executed</option>
                  <option value="blocked">blocked</option>
                </select>
              </label>
              <div className="grid gap-3 lg:content-end">
                <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-400">
                  <input
                    name="approval_required"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Approval before execution
                </label>
                <label className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-400">
                  <input
                    name="evidence_required"
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Evidence required
                </label>
              </div>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Add approval conditions, evidence requirements or audit context"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 lg:w-fit"
              >
                Create Execution Passport
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                Sign in to create execution passports and record the audit trail.
              </p>
              <Link
                href="/login?next=/execution-passports"
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
