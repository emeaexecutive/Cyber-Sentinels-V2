import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, any>;

type PassportViewerPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: unknown) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fieldValue(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function rowDate(row: AnyRow) {
  return String(row.created_at ?? row.updated_at ?? "");
}

function metadata(row: AnyRow) {
  const value = row.metadata;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function isRelatedEvent(row: AnyRow, passportId: string, caseIds: Set<string>) {
  const rowMetadata = metadata(row);
  const metadataPassportId = String(rowMetadata.passport_id ?? "");
  const metadataCaseId = String(rowMetadata.verification_case_id ?? "");

  return (
    metadataPassportId === passportId ||
    (metadataCaseId ? caseIds.has(metadataCaseId) : false)
  );
}

function sortNewestFirst(rows: AnyRow[]) {
  return [...rows].sort(
    (left, right) =>
      new Date(rowDate(right)).getTime() - new Date(rowDate(left)).getTime()
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 break-words text-base font-medium text-zinc-100">
        {fieldValue(value)}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
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
      <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/passport" className="text-sm text-zinc-400 hover:text-white">
            Back to Passports
          </Link>
          <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h1 className="text-3xl font-semibold">Passport not found</h1>
            <p className="mt-3 text-sm text-zinc-500">
              No trust passport exists for this ID.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const [{ data: verificationCases }, { data: evidenceFiles }] =
    await Promise.all([
      supabase
        .from("verification_cases")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("evidence_files")
        .select("*")
        .eq("passport_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const cases = verificationCases ?? [];
  const caseIds = new Set(cases.map((item) => String(item.id)));
  const evidence = evidenceFiles ?? [];

  const decisionQueries = [
    supabase
      .from("decisions")
      .select("*")
      .eq("passport_id", id)
      .order("created_at", { ascending: false }),
  ];

  if (caseIds.size) {
    decisionQueries.push(
      supabase
        .from("decisions")
        .select("*")
        .in("verification_case_id", [...caseIds])
        .order("created_at", { ascending: false })
    );
  }

  const [{ data: signalRows }, { data: auditRows }, ...decisionResults] =
    await Promise.all([
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
      ...decisionQueries,
    ]);

  const decisionsById = new Map<string, AnyRow>();
  decisionResults.forEach((result) => {
    (result.data ?? []).forEach((decision) => {
      decisionsById.set(String(decision.id), decision);
    });
  });
  const decisions = sortNewestFirst([...decisionsById.values()]);
  const latestVerification = cases[0];
  const latestDecision = decisions[0];
  const relatedSignals = sortNewestFirst(
    (signalRows ?? []).filter((row) => isRelatedEvent(row, id, caseIds))
  );
  const relatedAuditLogs = sortNewestFirst(
    (auditRows ?? []).filter((row) => isRelatedEvent(row, id, caseIds))
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/passport", "Passports"],
            ["/back-office", "Back Office"],
            ["/verification-queue", "Verification Queue"],
            ["/evidence-vault", "Evidence Vault"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Passport Viewer
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            {fieldValue(passport.subject_name, "Unnamed passport")}
          </h1>
          <p className="mt-4 break-all text-sm text-zinc-500">{id}</p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Passport Summary</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <InfoTile label="Passport ID" value={passport.id} />
            <InfoTile label="Name" value={passport.subject_name} />
            <InfoTile
              label="Status"
              value={
                passport.verification_status ??
                passport.review_status ??
                passport.reality_passport_status
              }
            />
            <InfoTile label="Created Date" value={formatDate(passport.created_at)} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Verification Summary</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoTile
                label="Current Status"
                value={
                  latestVerification?.verification_status ??
                  latestVerification?.status ??
                  passport.verification_status
                }
              />
              <InfoTile
                label="Latest Verification Date"
                value={formatDate(
                  latestVerification?.updated_at ?? latestVerification?.created_at
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Decision Panel</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoTile label="Latest Decision" value={latestDecision?.decision} />
              <InfoTile label="Decision Actor" value={latestDecision?.actor ?? latestDecision?.decided_by} />
              <InfoTile
                label="Decision Timestamp"
                value={formatDate(latestDecision?.created_at)}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Evidence Panel</h2>
            <span className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300">
              Evidence Count: {evidence.length}
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {evidence.length ? (
              evidence.map((item, index) => (
                <div
                  key={String(item.id ?? `evidence-${index}`)}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <InfoTile
                      label="Evidence Type"
                      value={item.evidence_type ?? item.media_type}
                    />
                    <InfoTile
                      label="Evidence Status"
                      value={item.status ?? item.scan_status}
                    />
                    <InfoTile label="Upload Date" value={formatDate(item.created_at)} />
                    <InfoTile label="File URL" value={item.file_url} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No evidence linked to this passport yet." />
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals Timeline</h2>
            <div className="mt-5 space-y-3">
              {relatedSignals.length ? (
                relatedSignals.map((signal, index) => (
                  <div
                    key={String(signal.id ?? `signal-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-200">{fieldValue(signal.event)}</p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(signal.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No passport-specific signals recorded yet." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Audit Timeline</h2>
            <div className="mt-5 space-y-3">
              {relatedAuditLogs.length ? (
                relatedAuditLogs.map((log, index) => (
                  <div
                    key={String(log.id ?? `audit-${index}`)}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-200">{fieldValue(log.event_type)}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {fieldValue(log.actor)}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No passport-specific audit events recorded yet." />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
