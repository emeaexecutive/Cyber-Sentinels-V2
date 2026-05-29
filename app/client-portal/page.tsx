import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";
import {
  demoClientEvidenceRequests,
  demoClientExports,
  demoClientPassports,
  demoClientReports,
  demoClientSummary,
  demoClientVerificationCases,
  futureClientOwnershipFields,
  type ClientOwnedFields,
} from "@/lib/trust-engine/clientPortal";
import { getPublicTrustFeed } from "@/lib/trust-feed/feed";

export const dynamic = "force-dynamic";

type Passport = ClientOwnedFields & {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  trust_score: number | null;
  review_status: string | null;
};

type VerificationCase = ClientOwnedFields & {
  id: string;
  subject_name: string | null;
  verification_status: string | null;
  status: string | null;
  trust_score: number | null;
};

type TrustReport = ClientOwnedFields & {
  id: string;
  candidate_name: string | null;
  review_status: string | null;
  trust_score: number | null;
};

type EvidenceFile = ClientOwnedFields & {
  id: string;
  file_name: string | null;
  scan_status: string | null;
};

type Signal = ClientOwnedFields & {
  id: string;
  event: string;
  created_at: string | null;
};

async function fetchOwned<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  ownerEmail: string,
  select = "*",
  limit = 6
) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("owner_email", ownerEmail)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<T[]>();

  if (error) return { rows: [] as T[], available: false };

  return { rows: data ?? [], available: true };
}

function statusClass(status: string | null | undefined) {
  if (["verified", "ready", "approved", "active"].includes(status ?? "")) {
    return "border-emerald-700 text-emerald-200";
  }

  if (["rejected", "revoked", "restricted"].includes(status ?? "")) {
    return "border-red-700 text-red-200";
  }

  return "border-amber-700 text-amber-200";
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
}

export default async function ClientPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?next=/command-center");
  }

  const [passports, verificationCases, trustReports, evidenceFiles, signals] =
    await Promise.all([
      fetchOwned<Passport>(
        supabase,
        "passports",
        user.email,
        "id,subject_name,subject_type,trust_score,review_status,owner_email,team_id,client_id,created_at"
      ),
      fetchOwned<VerificationCase>(
        supabase,
        "verification_cases",
        user.email,
        "id,subject_name,verification_status,status,trust_score,owner_email,team_id,client_id,created_at"
      ),
      fetchOwned<TrustReport>(
        supabase,
        "trust_reports",
        user.email,
        "id,candidate_name,review_status,trust_score,owner_email,team_id,client_id,created_at"
      ),
      fetchOwned<EvidenceFile>(
        supabase,
        "evidence_files",
        user.email,
        "id,file_name,scan_status,owner_email,team_id,client_id,created_at"
      ),
      fetchOwned<Signal>(
        supabase,
        "signals",
        user.email,
        "id,event,owner_email,team_id,client_id,created_at",
        8
      ),
    ]);
  const isDemo =
    !passports.available ||
    !verificationCases.available ||
    !trustReports.available ||
    !evidenceFiles.available ||
    !signals.available;
  const portalPassports = passports.rows.length
    ? passports.rows
    : demoClientPassports;
  const portalCases = verificationCases.rows.length
    ? verificationCases.rows
    : demoClientVerificationCases;
  const portalReports = trustReports.rows.length
    ? trustReports.rows
    : demoClientReports;
  const portalEvidence = evidenceFiles.rows.length
    ? evidenceFiles.rows
    : demoClientEvidenceRequests;
  const metrics = [
    ["Active Passports", passports.rows.length || demoClientSummary.passport_count],
    [
      "Open Verifications",
      verificationCases.rows.length || demoClientSummary.open_verifications,
    ],
    ["Reports Ready", trustReports.rows.length || demoClientSummary.reports_ready],
    [
      "Evidence Required",
      evidenceFiles.rows.length || demoClientSummary.evidence_required,
    ],
    ["Exports Ready", demoClientSummary.exports_ready],
    ["API Usage", demoClientSummary.api_usage],
    ["Current Clearance", demoClientSummary.current_clearance],
  ];
  const myActivity = getPublicTrustFeed(3);

  await createSignal(supabase, "client_portal_opened");
  await createAuditLog(supabase, "client_portal_accessed", user.email, {
    source: "client_portal",
  });

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/passport", "Trust Passport"],
            ["/team-workspace", "Team Workspace"],
            ["/verification-queue", "Verification Queue"],
            ["/compliance-export", "Compliance Export"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/verify", "Public Verify"],
            ["/profile", "Public Profiles"],
            ["/trust-feed", "Trust Feed"],
            ["/trust-ledger", "Trust Ledger"],
            ["/billing", "Billing"],
            ["/developer-console", "Developer Console"],
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
            Customer workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Client Portal&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Your trust records, verification cases and reports in one place.
          </p>
          {isDemo ? (
            <p className="mt-3 text-sm text-zinc-600">
              Client-owned data will appear here. V1 is using demo data until{" "}
              {futureClientOwnershipFields.join(", ")} fields are available.
            </p>
          ) : null}
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">My Trust Passports</h2>
            <div className="mt-5 space-y-3">
              {portalPassports.length ? (
                portalPassports.map((passport) => (
                  <div
                    key={passport.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {passport.subject_name ?? "Trust Passport"}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {passport.subject_type ?? "subject"} / Trust{" "}
                          {passport.trust_score ?? "n/a"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                          passport.review_status
                        )}`}
                      >
                        {passport.review_status ?? "pending"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState label="No client passports yet." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">My Verification Cases</h2>
            <div className="mt-5 space-y-3">
              {portalCases.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {item.subject_name ?? "Verification case"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.verification_status ?? item.status ?? "pending"} /
                    Trust {item.trust_score ?? "n/a"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Candidate Trust Reports</h2>
            <div className="mt-5 space-y-3">
              {portalReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {report.candidate_name ?? "Trust report"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {report.review_status ?? "draft"} / Trust{" "}
                    {report.trust_score ?? "n/a"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Evidence Requests</h2>
            <div className="mt-5 space-y-3">
              {portalEvidence.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {item.file_name ?? "Evidence request"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.scan_status ?? "requested"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Compliance Exports</h2>
            <div className="mt-5 space-y-3">
              {demoClientExports.map((item) => (
                <div
                  key={item.report_id}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">
                    {item.report_type}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.export_status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">My Activity</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Public-safe trust activity from profiles, badges, passports and
              verification updates.
            </p>
            <div className="mt-5 space-y-3">
              {myActivity.map((item) => (
                <Link
                  key={item.id}
                  href={item.public_link}
                  className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-cyan-700"
                >
                  <p className="font-medium text-zinc-100">{item.event}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {item.subject_name} / {item.status}
                  </p>
                </Link>
              ))}
            </div>
            <Link
              href="/trust-feed"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Feed
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">My Trust Ledger</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Ledger history for trust score changes, verification outcomes,
              recoveries and evidence updates will appear here.
            </p>
            <Link
              href="/trust-ledger"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Ledger
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">My Trust Seals</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Public-safe seals issued for active passports, reports, profiles
              and verified trust objects.
            </p>
            <div className="mt-5 space-y-3">
              {["Verified Human Seal", "Reality Passport Seal", "HPI Checked Seal"].map(
                (seal) => (
                  <div
                    key={seal}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">{seal}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Seal status placeholder
                    </p>
                  </div>
                )
              )}
            </div>
            <Link
              href="/trust-seal-authority"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seals
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Badges</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Shareable public verification links can be used without exposing
              private evidence. Clients can also share a public trust profile.
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Verified Human",
                "HPI™ Checked",
                "Reality Passport Active",
              ].map((badge) => (
                <div
                  key={badge}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <p className="font-medium text-zinc-100">{badge}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Badge status placeholder
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Billing / Clearances</h2>
            <p className="mt-4 text-3xl font-semibold">
              {demoClientSummary.current_clearance}
            </p>
            <Link
              href="/billing"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Billing
            </Link>
            <Link
              href="/team-workspace"
              className="ml-2 mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Team Workspace
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">API Usage</h2>
            <p className="mt-4 text-3xl font-semibold">
              {demoClientSummary.api_usage}
            </p>
            <Link
              href="/developer-console"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Developer Console
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Recent Signals</h2>
            <div className="mt-5 space-y-3">
              {signals.rows.length ? (
                signals.rows.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal.event}</p>
                  </div>
                ))
              ) : (
                [
                  "client_portal_opened",
                  "client_report_viewed",
                  "client_export_requested",
                  "client_evidence_requested",
                ].map((signal) => (
                  <div
                    key={signal}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="text-zinc-300">{signal}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
