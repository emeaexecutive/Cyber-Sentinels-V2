import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { BETA_MODE } from "@/lib/beta-mode";
import { getIntegrationRegistry } from "@/lib/integrations/registry";
import { createReadinessGateSnapshot } from "@/lib/readiness-gate/snapshot";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type FounderNote = {
  id: string;
  note: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
};

type CountResult = {
  count: number;
  available: boolean;
};

const noteStatuses = ["blocker", "improvement", "decision", "deferred"];

async function addFounderNote(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const user = await requireAdminPageAccess(supabase, {
    path: "/admin/founder-control",
    action: "add_founder_note",
  });
  const note = String(formData.get("note") ?? "").trim();
  const status = String(formData.get("status") ?? "decision").trim();

  if (!note) return;

  await supabase.from("launch_control_notes").insert({
    note: `[Founder Control] ${note}`,
    status: noteStatuses.includes(status) ? status : "decision",
    created_by: user.email ?? user.id,
  });

  revalidatePath("/admin/founder-control");
  revalidatePath("/admin/launch-control");
  revalidatePath("/admin/readiness-gate");
}

async function resolveFounderNote(formData: FormData) {
  "use server";

  const supabase = await createClient();
  await requireAdminPageAccess(supabase, {
    path: "/admin/founder-control",
    action: "resolve_founder_note",
  });
  const id = String(formData.get("id") ?? "").trim();

  if (!id) return;

  await supabase
    .from("launch_control_notes")
    .update({ status: "resolved" })
    .eq("id", id);

  revalidatePath("/admin/founder-control");
  revalidatePath("/admin/launch-control");
  revalidatePath("/admin/readiness-gate");
}

async function countTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string
): Promise<CountResult> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) return { count: 0, available: false };
  return { count: count ?? 0, available: true };
}

async function fetchRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<AnyRow[]>();

  return error ? [] : data ?? [];
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function metricValue(result: CountResult) {
  return result.available ? String(result.count) : "Unavailable";
}

function statusTone(status: string) {
  if (/ready|configured|connected|active/i.test(status)) return "border-emerald-800 text-emerald-200";
  if (/blocked|missing|failed|unsafe/i.test(status)) return "border-red-800 text-red-200";
  return "border-amber-800 text-amber-200";
}

function noteTone(status?: string | null) {
  if (status === "blocker") return "border-red-800 text-red-200";
  if (status === "resolved") return "border-emerald-800 text-emerald-200";
  if (status === "deferred") return "border-zinc-700 text-zinc-300";
  return "border-cyan-800 text-cyan-200";
}

function MetricGrid({
  items,
}: {
  items: Array<[string, string, string?]>;
}) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value, tone]) => (
        <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${tone ?? "text-zinc-100"}`}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function FounderControlPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/founder-control");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/founder-control" });

  const registry = getIntegrationRegistry();
  const integration = (provider: string) =>
    registry.find((item) => item.provider === provider);
  const stripe = integration("Stripe");
  const openai = integration("OpenAI");
  const worldId = integration("World ID");
  const supabaseHealth = integration("Supabase");

  const [
    readiness,
    enterpriseAccess,
    feedbackReports,
    waitlist,
    passports,
    evidenceFiles,
    verificationCases,
    decisions,
    appeals,
    notifications,
    auditLogs,
    signals,
    timelineEvents,
    relationships,
    governanceActions,
    replaySessions,
    notes,
    apiTestRuns,
  ] = await Promise.all([
    createReadinessGateSnapshot(supabase),
    countTable(supabase, "enterprise_access_requests"),
    countTable(supabase, "feedback_reports"),
    countTable(supabase, "waitlist"),
    countTable(supabase, "passports"),
    countTable(supabase, "evidence_files"),
    countTable(supabase, "verification_cases"),
    countTable(supabase, "decisions"),
    countTable(supabase, "appeals"),
    countTable(supabase, "notifications"),
    countTable(supabase, "audit_logs"),
    countTable(supabase, "signals"),
    countTable(supabase, "trust_timeline_events"),
    countTable(supabase, "trust_relationships"),
    countTable(supabase, "governance_actions"),
    countTable(supabase, "trust_replay_sessions"),
    fetchRows(supabase, "launch_control_notes", 40),
    fetchRows(supabase, "api_test_runs", 40),
  ]);

  const enterpriseRows = await fetchRows(supabase, "enterprise_access_requests", 80);
  const designPartnerInterest = enterpriseRows.filter((row) =>
    /design_partner/i.test(`${row.use_case ?? ""} ${row.status ?? ""} ${row.message ?? ""}`)
  ).length;
  const proWaitlistInterest =
    waitlist.count +
    enterpriseRows.filter(
      (row) =>
        String(row.use_case ?? "").endsWith("_waitlist") ||
        String(row.status ?? "").endsWith("_waitlist")
    ).length;
  const failedApiTests = apiTestRuns.filter((row) =>
    ["failed", "error"].includes(String(row.status ?? "").toLowerCase())
  );
  const unresolvedLaunchBlockers = (notes as FounderNote[]).filter(
    (note) => note.status === "blocker"
  );
  const attentionItems = [
    readiness.blockers.length
      ? `${readiness.blockers.length} readiness blocker${readiness.blockers.length === 1 ? "" : "s"}`
      : "",
    readiness.cautions.some((item) => /Enterprise access/i.test(item.label))
      ? "Enterprise access needs review"
      : "",
    readiness.blockers.some((item) => /callback/i.test(item.label))
      ? "Auth callback issue"
      : "",
    stripe?.status === "disabled" ? "Stripe is disabled" : "",
    openai?.status === "disabled" ? "OpenAI is disabled" : "",
    failedApiTests.length ? `${failedApiTests.length} failed API test${failedApiTests.length === 1 ? "" : "s"}` : "",
    unresolvedLaunchBlockers.length
      ? `${unresolvedLaunchBlockers.length} unresolved launch blocker${unresolvedLaunchBlockers.length === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">Admin Access Verified</p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold">Founder Control Room</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-400">
                A calm founder-facing control room for private beta monitoring,
                design-partner learning and operational readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/back-office" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Back Office
              </Link>
              <Link href="/admin/readiness-gate" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Readiness Gate
              </Link>
              <Link href="/admin/api-tests" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                API Tests
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                Launch Status
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{readiness.status}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                {readiness.summary}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(readiness.status)}`}>
              {BETA_MODE ? "Beta mode active" : "Beta mode off"}
            </span>
          </div>
          <MetricGrid
            items={[
              ["Beta mode", BETA_MODE ? "Active" : "Off", BETA_MODE ? "text-cyan-100" : "text-zinc-400"],
              ["Blockers", String(readiness.blockers.length), readiness.blockers.length ? "text-red-200" : "text-emerald-200"],
              ["Cautions", String(readiness.cautions.length), readiness.cautions.length ? "text-amber-200" : "text-emerald-200"],
              ["Launch notes", String(notes.length), "text-zinc-100"],
            ]}
          />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Growth Signals</h2>
          <MetricGrid
            items={[
              ["Enterprise access requests", metricValue(enterpriseAccess)],
              ["Design partner interest", String(designPartnerInterest)],
              ["Pro waitlist", waitlist.available ? String(proWaitlistInterest) : "Unavailable"],
              ["Feedback reports", metricValue(feedbackReports)],
            ]}
          />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Product Signals</h2>
          <MetricGrid
            items={[
              ["Passports created", metricValue(passports)],
              ["Evidence uploaded", metricValue(evidenceFiles)],
              ["Verification cases", metricValue(verificationCases)],
              ["Decisions made", metricValue(decisions)],
              ["Appeals submitted", metricValue(appeals)],
              ["Notifications created", metricValue(notifications)],
            ]}
          />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Trust Infrastructure Signals</h2>
          <MetricGrid
            items={[
              ["Audit logs", metricValue(auditLogs)],
              ["Signals", metricValue(signals)],
              ["Timeline events", metricValue(timelineEvents)],
              ["Trust relationships", metricValue(relationships)],
              ["Governance actions", metricValue(governanceActions)],
              ["Replay sessions", metricValue(replaySessions)],
            ]}
          />
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Integration Health</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Supabase", supabaseHealth?.status === "configured" ? "connected" : "missing"],
              ["Service Role", process.env.SUPABASE_SERVICE_ROLE_KEY ? "configured" : "missing"],
              ["Stripe", stripe?.status ?? "unknown"],
              ["OpenAI", openai?.status ?? "unknown"],
              ["World ID", worldId?.status ?? "unknown"],
            ].map(([label, status]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">{label}</p>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs ${statusTone(status)}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">What Needs Attention</h2>
          <div className="mt-5 grid gap-3">
            {attentionItems.length ? (
              attentionItems.map((item) => (
                <div key={item} className="rounded-lg border border-amber-800 bg-black p-4 text-sm text-amber-100">
                  {item}
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                No immediate founder attention items are visible.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Add Founder Note</h2>
            <form action={addFounderNote} className="mt-5 grid gap-4">
              <select
                name="status"
                defaultValue="decision"
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
              >
                {noteStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <textarea
                name="note"
                required
                rows={5}
                placeholder="Record a founder decision, blocker, improvement or deferred item."
                className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white"
              />
              <button className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
                Add Note
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Founder Notes</h2>
            <div className="mt-5 grid gap-3">
              {(notes as FounderNote[]).length ? (
                (notes as FounderNote[]).map((note) => (
                  <article key={note.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <span className={`rounded-full border px-3 py-1 text-xs ${noteTone(note.status)}`}>
                        {note.status ?? "open"}
                      </span>
                      <p className="text-xs text-zinc-600">{formatDate(note.created_at)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{note.note}</p>
                    <p className="mt-3 text-xs text-zinc-600">
                      {note.created_by ?? "admin"}
                    </p>
                    {note.status !== "resolved" ? (
                      <form action={resolveFounderNote} className="mt-4">
                        <input type="hidden" name="id" value={note.id} />
                        <button className="rounded-lg border border-emerald-800 px-3 py-2 text-xs text-emerald-100 hover:text-white">
                          Mark Resolved
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-black p-5 text-sm text-zinc-500">
                  No founder notes yet.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
