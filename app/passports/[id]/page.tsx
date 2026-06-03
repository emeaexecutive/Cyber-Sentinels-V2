import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateTrustScoreV1 } from "@/lib/trust-score-engine";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type PassportViewerPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function value(value: unknown, fallback = "Not recorded") {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}

function rowMetadata(row: AnyRow) {
  const metadata = row.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function relatedEvent(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const metadata = rowMetadata(row);
  const metaPassportId = String(metadata.passport_id ?? "");
  const metaCaseId = String(metadata.verification_case_id ?? "");

  return (
    metaPassportId === passportId ||
    (metaCaseId ? caseIds.has(metaCaseId) : false)
  );
}

function StatusChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-100">
      {children}
    </span>
  );
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
      <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">{label}</p>;
}

export default async function PassportViewerPage({
  params,
}: PassportViewerPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/passports/${encodeURIComponent(id)}`);
  }

  const { data: passport } = await supabase
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!passport) {
    return (
      <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-semibold">Passport not found</h1>
          <Link href="/passports" className="mt-5 inline-flex text-sm text-cyan-200">
            Back to Trust Passports
          </Link>
        </div>
      </main>
    );
  }

  const { data: verificationCases } = await supabase
    .from("verification_cases")
    .select("*")
    .eq("passport_id", id)
    .order("created_at", { ascending: false });
  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => String(item.id)));
  const [{ data: passportEvidence }, { data: caseEvidence }] = await Promise.all([
    supabase
      .from("evidence_files")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
    caseIds.size
      ? supabase
          .from("evidence_files")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const evidenceById = new Map<string, AnyRow>();
  [...(passportEvidence ?? []), ...(caseEvidence ?? [])].forEach((row) =>
    evidenceById.set(String(row.id), row)
  );
  const evidence = [...evidenceById.values()];
  const [{ data: passportDecisions }, { data: caseDecisions }] = await Promise.all([
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
    caseIds.size
      ? supabase
          .from("decisions")
          .select("*")
          .in("verification_case_id", [...caseIds])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as AnyRow[] }),
  ]);
  const decisionById = new Map<string, AnyRow>();
  [...(passportDecisions ?? []), ...(caseDecisions ?? [])].forEach((row) =>
    decisionById.set(String(row.id), row)
  );
  const decisions = [...decisionById.values()];
  const [{ data: signalRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from("signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const subjectNeedle = String(passport.subject_name ?? "").toLowerCase();
  const signals = (signalRows ?? [])
    .filter(
      (row) =>
        relatedEvent(row, id, caseIds) ||
        (subjectNeedle
          ? String(row.event ?? "").toLowerCase().includes(subjectNeedle)
          : false)
    )
    .slice(0, 12);
  const auditLogs = (auditRows ?? [])
    .filter((row) => relatedEvent(row, id, caseIds))
    .slice(0, 12);
  const score = calculateTrustScoreV1({
    passport,
    evidence,
    decisions,
    auditLogs,
    signals,
  });
  const status =
    passport.verification_status ??
    passport.review_status ??
    passport.reality_passport_status ??
    "pending";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Passport
          </p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                {value(passport.subject_name, "Unnamed passport")}
              </h1>
              <p className="mt-3 text-sm text-zinc-500">{id}</p>
            </div>
            <Link
              href={`/trust-graph-engine?passport_id=${encodeURIComponent(id)}`}
              className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
            >
              Open Trust Graph
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Trust Score</p>
            <p className="mt-3 text-4xl font-semibold">{score.score}</p>
            <p className="mt-1 text-sm text-cyan-200">{score.confidenceLabel}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Status</p>
            <div className="mt-4"><StatusChip>{value(status)}</StatusChip></div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">Created</p>
            <p className="mt-3 text-lg text-zinc-100">{formatDate(passport.created_at)}</p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel title="Evidence">
            {evidence.length ? (
              evidence.map((item) => (
                <div key={String(item.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium">{value(item.file_name ?? item.file_url, "Evidence file")}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(item.evidence_type ?? item.file_type)} / {value(item.status ?? item.scan_status, "pending")}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(item.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No evidence linked yet." />
            )}
          </Panel>

          <Panel title="Decisions">
            {decisions.length ? (
              decisions.map((decision) => (
                <div key={String(decision.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="font-medium">{value(decision.decision, "Decision")}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {value(decision.status)} / {value(decision.actor ?? decision.decided_by)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(decision.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No decisions recorded yet." />
            )}
          </Panel>

          <Panel title="Signals">
            {signals.length ? (
              signals.map((signal) => (
                <div key={String(signal.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{value(signal.event)}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(signal.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No linked signals yet." />
            )}
          </Panel>

          <Panel title="Audit Trail">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div key={String(log.id)} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <p className="text-sm text-zinc-300">{value(log.event_type)}</p>
                  <p className="mt-1 text-sm text-zinc-500">{value(log.actor)}</p>
                  <p className="mt-2 text-xs text-zinc-600">{formatDate(log.created_at)}</p>
                </div>
              ))
            ) : (
              <Empty label="No linked audit trail yet." />
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
