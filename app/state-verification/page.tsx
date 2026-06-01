import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type StateVerificationPageProps = {
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

const stateLayers = [
  [
    "Identity State",
    "Tracks whether the passport subject is still verified, current and attributable.",
  ],
  [
    "Evidence State",
    "Monitors whether supporting evidence is present, fresh and still aligned to the claim.",
  ],
  [
    "Decision State",
    "Connects approvals, rejections and escalations to the active trust posture.",
  ],
  [
    "Risk State",
    "Surfaces how trust is moving as new signals, audit events and decisions accumulate.",
  ],
];

const metricTables = [
  ["passports", "Passports"],
  ["verification_cases", "Verification Cases"],
  ["decisions", "Decisions"],
  ["signals", "Signals"],
  ["audit_logs", "Audit Events"],
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

async function createStateCheck(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/state-verification");
  }

  const passportId = String(formData.get("passport_id") ?? "").trim();
  const identityState = String(formData.get("identity_state") ?? "").trim();
  const evidenceState = String(formData.get("evidence_state") ?? "").trim();
  const trustState = String(formData.get("trust_state") ?? "").trim();
  const riskMovement = String(formData.get("risk_movement") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!passportId) {
    redirect("/state-verification");
  }

  const actor = user.email ?? user.id;
  const { data: stateCheck, error } = await supabase
    .from("passport_state_checks")
    .insert({
      passport_id: passportId,
      identity_state: identityState || "current",
      evidence_state: evidenceState || "under_review",
      trust_state: trustState || "stable",
      risk_movement: riskMovement || "unchanged",
      notes: notes || null,
      created_by: actor,
    })
    .select("id")
    .single();

  if (!error) {
    await createAuditLog(supabase, "state_verification_created", actor, {
      passport_state_check_id: stateCheck?.id,
      passport_id: passportId,
      identity_state: identityState || "current",
      evidence_state: evidenceState || "under_review",
      trust_state: trustState || "stable",
      risk_movement: riskMovement || "unchanged",
    });
    await createSignal(supabase, "State verification created");
  }

  redirect("/state-verification?created=1");
}

export default async function StateVerificationPage({
  searchParams,
}: StateVerificationPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [metrics, { data: passports }] = await Promise.all([
    Promise.all(metricTables.map(([table, label]) => liveCount(table, label))),
    supabase
      .from("passports")
      .select("id,subject_name,subject_type")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PassportOption[]>(),
  ]);
  const passportOptions = passports ?? [];
  const metricsUnavailable = metrics.some((metric) => !metric.available);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            State Verification
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                State Verification Layer&trade;
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Cyber Sentinels continuously evaluates identity state, evidence
                state and trust state over time.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Trust is dynamic. Verification is continuous. Static identity is
                insufficient.
              </p>
            </div>
            <Link
              href="/passports"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Trust Passports
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            State Verification Overview
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stateLayers.map(([title, copy]) => (
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
                State Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Live trust-state inputs across the passport system.
              </h2>
            </div>
            {metricsUnavailable ? (
              <p className="text-sm text-amber-200">Some live metrics unavailable.</p>
            ) : null}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                State Check Form
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Record how trust changes over time.
              </h2>
            </div>
          </div>
          {params?.created === "1" ? (
            <p className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
              State verification created.
            </p>
          ) : null}
          {user ? (
            <form action={createStateCheck} className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
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
                Identity state
                <select
                  name="identity_state"
                  defaultValue="current"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="current">current</option>
                  <option value="stale">stale</option>
                  <option value="changed">changed</option>
                  <option value="unverified">unverified</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Evidence state
                <select
                  name="evidence_state"
                  defaultValue="under_review"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="fresh">fresh</option>
                  <option value="under_review">under_review</option>
                  <option value="stale">stale</option>
                  <option value="missing">missing</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Trust state
                <select
                  name="trust_state"
                  defaultValue="stable"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="improving">improving</option>
                  <option value="stable">stable</option>
                  <option value="degrading">degrading</option>
                  <option value="requires_review">requires_review</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400">
                Risk movement
                <select
                  name="risk_movement"
                  defaultValue="unchanged"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white"
                >
                  <option value="reduced">reduced</option>
                  <option value="unchanged">unchanged</option>
                  <option value="increased">increased</option>
                  <option value="escalated">escalated</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-zinc-400 lg:col-span-2">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Add context about changed evidence, review outcomes or risk movement"
                  className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100 lg:w-fit"
              >
                Create State Check
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-400">
                Sign in to create state checks and record the audit trail.
              </p>
              <Link
                href="/login?next=/state-verification"
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
