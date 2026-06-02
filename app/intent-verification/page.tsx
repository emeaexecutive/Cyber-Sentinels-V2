import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type IntentVerificationPageProps = {
  searchParams?: Promise<{ created?: string }>;
};

const governanceCards = [
  ["Who is acting?", "Bind action to a verified person, candidate, contractor or workflow subject."],
  ["What are they trying to do?", "Turn a requested action into a reviewable trust event."],
  ["What evidence supports it?", "Use the same evidence chain that already supports Trust Passports."],
  ["What risk does it carry?", "Classify the request before approval expands access or authority."],
  ["Should it be approved?", "Keep human review and audit history attached to the decision."],
];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusChipClass(status?: string | null) {
  if (status === "verified") {
    return "border-emerald-800 bg-emerald-950/20 text-emerald-200";
  }

  if (status === "rejected") {
    return "border-red-900 bg-red-950/20 text-red-200";
  }

  if (status === "escalated") {
    return "border-amber-800 bg-amber-950/20 text-amber-200";
  }

  return "border-cyan-800 bg-cyan-950/20 text-cyan-100";
}

function valueOrFallback(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

async function createIntentRequest(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/intent-verification");
  }

  const intentSummary = String(formData.get("intent_summary") ?? "").trim();
  const riskLevel = String(formData.get("risk_level") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!intentSummary) {
    redirect("/intent-verification");
  }

  const actor = user.email ?? user.id;
  const { data: intentRequest, error } = await supabase
    .from("intent_requests")
    .insert({
      intent_summary: intentSummary,
      risk_level: riskLevel || "unclassified",
      notes: notes || null,
      created_by: actor,
    })
    .select("id")
    .single();

  if (!error) {
    const graphMetadata = {
      intent_id: intentRequest?.id,
      intent_request_id: intentRequest?.id,
      intent_summary: intentSummary,
      risk_level: riskLevel || "unclassified",
      actor,
    };

    await createAuditLog(supabase, "intent_request_created", actor, graphMetadata);
    await createSignal(supabase, "Intent request created", graphMetadata);
  }

  redirect("/intent-verification?created=1");
}

export default async function IntentVerificationPage({
  searchParams,
}: IntentVerificationPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: verificationCases }, { data: decisions }] = await Promise.all([
    supabase
      .from("verification_cases")
      .select("id,passport_id,subject_name,subject_type,status,verification_status,created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AnyRow[]>(),
    supabase
      .from("decisions")
      .select("id,verification_case_id,case_id,decision,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<AnyRow[]>(),
  ]);
  const latestDecisionByCase = new Map<string, AnyRow>();

  (decisions ?? []).forEach((decision) => {
    const caseId = decision.verification_case_id ?? decision.case_id;

    if (caseId && !latestDecisionByCase.has(String(caseId))) {
      latestDecisionByCase.set(String(caseId), decision);
    }
  });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-black via-zinc-950 to-[#06111d] p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Intent Governance
          </p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Intent Verification Layer™
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                Authentication proves identity. Intent proves legitimacy.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-500">
                Identity proves who. Intent proves why.
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
                href="/workforce-trust"
                className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
              >
                View Workforce Trust
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
            Intent Governance Explanation
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {governanceCards.map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
                  Intent Request Preview
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Verification cases viewed as intent requests.
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {verificationCases?.length ? (
                verificationCases.map((item) => {
                  const latestDecision = latestDecisionByCase.get(String(item.id));

                  return (
                    <div
                      key={String(item.id)}
                      className="rounded-lg border border-zinc-800 bg-black p-4"
                    >
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.8fr_0.9fr_0.9fr_auto] xl:items-center">
                        <div>
                          <p className="text-xs text-zinc-500 xl:hidden">Subject</p>
                          <p className="font-medium text-zinc-100">
                            {valueOrFallback(item.subject_name, "Unnamed subject")}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600">
                            {valueOrFallback(item.subject_type, "unknown")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 xl:hidden">
                            Requested Action
                          </p>
                          <p className="text-sm text-zinc-300">
                            verification approval
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 xl:hidden">Status</p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusChipClass(
                              item.verification_status ?? item.status
                            )}`}
                          >
                            {valueOrFallback(
                              item.verification_status ?? item.status,
                              "pending"
                            )}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 xl:hidden">
                            Latest Decision
                          </p>
                          <p className="text-sm text-zinc-300">
                            {latestDecision
                              ? [
                                  latestDecision.decision,
                                  latestDecision.status,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")
                              : "No decisions recorded yet."}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 xl:hidden">Created</p>
                          <p className="text-sm text-zinc-300">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        {item.passport_id ? (
                          <Link
                            href={`/passports/${encodeURIComponent(String(item.passport_id))}`}
                            className="rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
                          >
                            View Passport
                          </Link>
                        ) : (
                          <span className="rounded-lg border border-zinc-800 px-3 py-2 text-center text-sm text-zinc-600">
                            No passport linked
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                  No verification cases available yet. Create a Trust Passport to populate intent previews.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">
              Create Intent Test
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Capture a lightweight intent request.
            </h2>
            {params?.created === "1" ? (
              <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/20 p-3 text-sm text-emerald-200">
                Intent request created.
              </p>
            ) : null}
            {user ? (
              <form action={createIntentRequest} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm text-zinc-400">
                  Intent summary
                  <input
                    name="intent_summary"
                    required
                    placeholder="Describe the action being requested"
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
                  Notes
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Add context for review"
                    className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-white placeholder:text-zinc-600"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
                >
                  Create Intent Test
                </button>
              </form>
            ) : (
              <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-400">
                  Sign in to create an intent test and record the audit trail.
                </p>
                <Link
                  href="/login?next=/intent-verification"
                  className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
