import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  calculateTrustScoreV1,
  isRowLinkedToPassport,
} from "@/lib/trust-score-engine";

export const dynamic = "force-dynamic";

type PassportRow = {
  id: string;
  user_email?: string | null;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  review_status: string | null;
  trust_score: number | null;
  verified?: boolean | null;
  created_at: string | null;
};

type AnyRow = Record<string, any>;

type RegistryPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    type?: string;
  }>;
};

function formatDate(value: string | null) {
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

function valueOrFallback(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}

function StatusChip({ value }: { value?: string | null }) {
  return (
    <span className="inline-flex rounded-full border border-cyan-800/70 bg-cyan-950/20 px-2.5 py-1 text-xs text-cyan-100">
      {valueOrFallback(value)}
    </span>
  );
}

function matchesFilter(passport: PassportRow, filters: { q: string; status: string; type: string }) {
  const haystack = [
    passport.subject_name,
    passport.subject_type,
    passport.verification_status,
    passport.review_status,
    passport.id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const qMatch = filters.q ? haystack.includes(filters.q.toLowerCase()) : true;
  const statusMatch = filters.status
    ? [passport.verification_status, passport.review_status].includes(filters.status)
    : true;
  const typeMatch = filters.type ? passport.subject_type === filters.type : true;

  return qMatch && statusMatch && typeMatch;
}

export default async function TrustPassportRegistryPage({
  searchParams,
}: RegistryPageProps) {
  const params = await searchParams;
  const filters = {
    q: params?.q?.trim() ?? "",
    status: params?.status?.trim() ?? "",
    type: params?.type?.trim() ?? "",
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/passports");
  }

  const [
    { data: passports },
    { data: verificationCases },
    { data: evidenceFiles },
    { data: decisions },
    { data: auditLogs },
    { data: signals },
  ] = await Promise.all([
    supabase
      .from("passports")
      .select(
        "id,user_email,subject_name,subject_type,verification_status,review_status,trust_score,verified,created_at"
      )
      .eq("user_email", user.email ?? "")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<PassportRow[]>(),
    supabase.from("verification_cases").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("evidence_files").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("decisions").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("audit_logs").select("*").limit(1000).returns<AnyRow[]>(),
    supabase.from("signals").select("*").limit(1000).returns<AnyRow[]>(),
  ]);

  const rows = passports ?? [];
  const cases = verificationCases ?? [];
  const allEvidence = evidenceFiles ?? [];
  const allDecisions = decisions ?? [];
  const allAuditLogs = auditLogs ?? [];
  const allSignals = signals ?? [];
  const caseIdsByPassport = new Map<string, Set<string>>();

  cases.forEach((item) => {
    if (!item.passport_id || !item.id) {
      return;
    }

    const passportId = String(item.passport_id);
    const current = caseIdsByPassport.get(passportId) ?? new Set<string>();
    current.add(String(item.id));
    caseIdsByPassport.set(passportId, current);
  });

  const trustScoresByPassport = new Map(
    rows.map((passport) => {
      const caseIds = caseIdsByPassport.get(passport.id) ?? new Set<string>();

      return [
        passport.id,
        calculateTrustScoreV1({
          passport,
          evidence: allEvidence.filter((row) =>
            isRowLinkedToPassport(row, passport.id, caseIds)
          ),
          decisions: allDecisions.filter((row) =>
            isRowLinkedToPassport(row, passport.id, caseIds)
          ),
          auditLogs: allAuditLogs.filter((row) =>
            isRowLinkedToPassport(row, passport.id, caseIds)
          ),
          signals: allSignals.filter((row) =>
            isRowLinkedToPassport(row, passport.id, caseIds)
          ),
        }),
      ] as const;
    })
  );
  const filteredPassports = rows.filter((passport) =>
    matchesFilter(passport, filters)
  );
  const statuses = Array.from(
    new Set(
      rows
        .flatMap((passport) => [
          passport.verification_status,
          passport.review_status,
        ])
        .filter(Boolean)
    )
  ) as string[];
  const subjectTypes = Array.from(
    new Set(rows.map((passport) => passport.subject_type).filter(Boolean))
  ) as string[];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-gradient-to-br from-zinc-950 to-[#06111d] p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Trust Passport Registry
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold md:text-6xl">
                Latest Trust Passports
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                Identity proves who. Evidence proves why. Open a passport to
                inspect the complete trust timeline.
              </p>
            </div>
            <Link
              href="/passport"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              Create Passport
            </Link>
          </div>
        </section>

        <form className="mt-6 grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_0.6fr_0.6fr_auto]">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search name, type, status or ID"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={filters.type}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            <option value="">All subject types</option>
            {subjectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-300"
          >
            Filter
          </button>
        </form>

        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="hidden grid-cols-[1.3fr_0.7fr_0.9fr_0.9fr_1.2fr_1fr_auto] gap-4 border-b border-zinc-800 pb-3 text-xs uppercase tracking-[0.18em] text-zinc-500 lg:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Verification</span>
            <span>Review</span>
            <span>Trust</span>
            <span>Created</span>
            <span>Action</span>
          </div>

          <div className="mt-4 space-y-3">
            {filteredPassports.length ? (
              filteredPassports.map((passport) => {
                const trustScore = trustScoresByPassport.get(passport.id);

                return (
                  <div
                    key={passport.id}
                    className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-4 lg:grid-cols-[1.3fr_0.7fr_0.9fr_0.9fr_1.2fr_1fr_auto] lg:items-center"
                  >
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Name</p>
                    <p className="font-medium text-zinc-100">
                      {valueOrFallback(passport.subject_name)}
                    </p>
                    <p className="mt-1 break-all text-xs text-zinc-600">
                      {passport.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Type</p>
                    <p className="text-sm text-zinc-300">
                      {valueOrFallback(passport.subject_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">
                      Verification
                    </p>
                    <StatusChip value={passport.verification_status} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Review</p>
                    <StatusChip value={passport.review_status} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Trust</p>
                    <p className="text-2xl font-semibold text-zinc-100">
                      {trustScore?.score ?? valueOrFallback(passport.trust_score)}
                    </p>
                    <p className="mt-1 text-xs text-cyan-200">
                      {trustScore?.confidenceLabel ?? "In Review"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {(trustScore?.reasonCodes.length
                        ? trustScore.reasonCodes
                        : ["Evidence missing"]
                      ).join(" / ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 lg:hidden">Created</p>
                    <p className="text-sm text-zinc-300">
                      {formatDate(passport.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/passports/${encodeURIComponent(passport.id)}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-300 hover:border-cyan-500 hover:text-white"
                  >
                    View Passport
                  </Link>
                </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-black p-5">
                <p className="text-sm text-zinc-400">
                  {rows.length
                    ? "No Trust Passports match this view. Clear filters or adjust the search."
                    : "No passports yet. Create a Trust Passport to start the demo workflow."}
                </p>
                {!rows.length ? (
                  <Link
                    href="/passport"
                    className="mt-4 inline-flex rounded-lg border border-cyan-800 px-3 py-2 text-sm text-cyan-100 hover:text-white"
                  >
                    Create Trust Passport
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
