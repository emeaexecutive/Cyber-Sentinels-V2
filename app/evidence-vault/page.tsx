import Link from "next/link";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { resolveIdentityUiEnterprise } from "@/lib/identity-signals/ui-enterprise";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getEvidenceSummary,
  normalizeEvidenceRows,
  type EvidenceRecord,
} from "@/lib/trust-engine/evidence";

export const dynamic = "force-dynamic";

type Passport = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  trust_score: number | null;
  review_status: string | null;
};

type VerificationCase = {
  id: string;
  subject_name: string | null;
  subject_type: string | null;
  verification_status: string | null;
  trust_score: number | null;
};

type CanonicalEvidence = {
  evidence_id: string;
  evidence_type: string;
  source_type: string;
  source_key: string;
  provider_key: string | null;
  evidence_classification: string;
  server_verified: boolean;
  cryptographically_verified: boolean;
  payload_hash: string;
  subject_id: string;
  occurred_at: string;
  expires_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "n/a";

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadgeClass(status: string) {
  if (["tampered", "rejected", "broken"].includes(status)) {
    return "border-red-700 text-red-200";
  }

  if (["suspicious", "scanning", "incomplete"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  if (["clean", "intact"].includes(status)) {
    return "border-emerald-700 text-emerald-200";
  }

  return "border-zinc-700 text-zinc-300";
}

function EvidenceCard({ evidence }: { evidence: EvidenceRecord }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
            {evidence.file_type ?? evidence.evidence_type}
          </p>
          <h3 className="mt-2 font-semibold text-zinc-100">
            {evidence.file_name ?? "Evidence artefact"}
          </h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(
            evidence.scan_status
          )}`}
        >
          {evidence.scan_status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <p className="text-zinc-500">
          Source <span className="text-zinc-300">{evidence.source ?? "n/a"}</span>
        </p>
        <p className="text-zinc-500">
          Submitted by{" "}
          <span className="text-zinc-300">{evidence.submitted_by ?? "n/a"}</span>
        </p>
        <p className="text-zinc-500">
          File{" "}
          <span className="text-zinc-300">
            {evidence.public_url || evidence.storage_path ? "available" : "n/a"}
          </span>
        </p>
        <p className="text-zinc-500">
          Origin{" "}
          <span className="text-zinc-300">
            {evidence.origin_trace_score ?? "n/a"}
          </span>
        </p>
        <p className="text-zinc-500">
          HPI{" "}
          <span className="text-zinc-300">
            {evidence.human_presence_index ?? "n/a"}
          </span>
        </p>
      </div>
      <div className="mt-4 border-t border-zinc-900 pt-3 text-xs text-zinc-600">
        <p>Hash {evidence.hash ?? "not recorded"}</p>
        <p className="mt-1">Created {formatDate(evidence.created_at)}</p>
      </div>
      {evidence.public_url ? (
        <Link
          href={evidence.public_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
        >
          Open Evidence
        </Link>
      ) : null}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-zinc-500">{label}</p>;
}

export default async function EvidenceVaultPage() {
  const supabase = await createClient();
  await requireAdminPageAccess(supabase, { path: "/evidence-vault" });
  const { workspace } = await resolveIdentityUiEnterprise();

  const [{ data: evidenceRows }, { data: passports }, { data: cases }, canonicalResult] =
    await Promise.all([
      supabase
        .from("evidence_files")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("passports")
        .select("id,subject_name,subject_type,trust_score,review_status")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<Passport[]>(),
      supabase
        .from("verification_cases")
        .select("id,subject_name,subject_type,verification_status,trust_score")
        .order("created_at", { ascending: false })
        .limit(8)
        .returns<VerificationCase[]>(),
      workspace ? createServiceRoleClient().from("evidence_objects")
        .select("evidence_id,evidence_type,source_type,source_key,provider_key,evidence_classification,server_verified,cryptographically_verified,payload_hash,subject_id,occurred_at,expires_at")
        .eq("enterprise_id", workspace.id).order("occurred_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    ]);
  const canonicalEvidence = (canonicalResult.data ?? []) as CanonicalEvidence[];

  const normalizedEvidence = normalizeEvidenceRows(evidenceRows);
  const evidence = normalizedEvidence;
  const summary = getEvidenceSummary(evidence);
  const pendingScan = evidence.filter((item) =>
    ["submitted", "scanning"].includes(item.scan_status)
  );
  const suspiciousEvidence = evidence.filter((item) =>
    ["suspicious", "tampered", "rejected"].includes(item.scan_status)
  );
  const custodyEvidence = evidence.filter((item) =>
    ["incomplete", "broken", "unknown"].includes(
      item.chain_of_custody_status
    )
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/passport", "Create Passport"],
            ["/passports", "Trust Passports"],
            ["/verification-queue", "Verification Queue"],
            ["/evidence-vault", "Evidence Vault"],
            ["/mission-control", "Mission Control"],
            ["/back-office", "Back Office"],
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
            Evidence operations
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Evidence Vault&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Evidence is not just uploaded. It becomes part of the trust chain.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-cyan-900/70 bg-cyan-950/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">V1 canonical evidence</p>
          <h2 className="mt-2 text-2xl font-semibold">Evidence Objects used by the current Trust API</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Provider identity, source classification, verification state, subject, and digest are shown without treating client assertions as independent proof.</p>
          {canonicalResult.error ? <p role="alert" className="mt-5 rounded-lg border border-rose-900 p-4 text-sm text-rose-200">Canonical evidence is temporarily unavailable. Historical uploads are not substituted as V1 evidence.</p> : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">{canonicalEvidence.map((item) => <article key={item.evidence_id} className="rounded-lg border border-zinc-800 bg-black p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{item.evidence_type}</p><p className="mt-1 text-xs text-zinc-500">Subject {item.subject_id}</p></div><span className={`rounded-full border px-3 py-1 text-xs ${item.server_verified ? "border-emerald-800 text-emerald-200" : "border-amber-800 text-amber-200"}`}>{item.server_verified ? "SERVER_VERIFIED" : "AGENT_ASSERTED / UNVERIFIED"}</span></div><dl className="mt-4 grid gap-2 text-xs text-zinc-400"><div>Source: {item.source_type}:{item.source_key}</div><div>Provider: {item.provider_key ?? "Not independently attributed"}</div><div>Classification: {item.evidence_classification}</div><div>Cryptographic verification: {item.cryptographically_verified ? "verified" : "not verified"}</div><div className="break-all font-mono text-zinc-600">Digest: {item.payload_hash}</div><div>Occurred: {new Date(item.occurred_at).toLocaleString()}</div></dl></article>)}{!canonicalResult.error && !canonicalEvidence.length ? <p className="rounded-lg border border-dashed border-zinc-700 p-5 text-sm text-zinc-500">No canonical V1 Evidence Objects are stored for this workspace.</p> : null}</div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Historical file-vault ingestion</h2>
              <p className="mt-2 text-sm text-zinc-500">
                This pre-V1 file flow is inactive in Production. Existing records remain visible as historical artefacts and are not canonical API evidence.
              </p>
            </div>
            <button
              disabled
              className="rounded-lg border border-zinc-800 px-4 py-2 text-sm text-zinc-600"
            >
              Upload unavailable
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-6">
          {[
            ["Evidence Summary", summary.total],
            ["Pending Scan", summary.pendingScan],
            ["Suspicious Evidence", summary.suspicious],
            ["Chain Issues", summary.custodyIssues],
            ["Linked Passports", summary.linkedPassports],
            ["Linked Cases", summary.linkedCases],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Pending Scan</h2>
            <div className="mt-5 space-y-3">
              {pendingScan.length ? (
                pendingScan.map((item) => (
                  <EvidenceCard key={item.id} evidence={item} />
                ))
              ) : (
                <EmptyState label="No evidence is waiting for review. Uploaded files will appear here when they need operational attention." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Suspicious Evidence</h2>
            <div className="mt-5 space-y-3">
              {suspiciousEvidence.length ? (
                suspiciousEvidence.map((item) => (
                  <EvidenceCard key={item.id} evidence={item} />
                ))
              ) : (
                <EmptyState label="No evidence needs escalation right now. Review flags will appear here when a file requires closer attention." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Chain of Custody</h2>
            <div className="mt-5 space-y-3">
              {custodyEvidence.length ? (
                custodyEvidence.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="font-medium text-zinc-100">
                        {item.file_name}
                      </p>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${statusBadgeClass(
                          item.chain_of_custody_status
                        )}`}
                      >
                        {item.chain_of_custody_status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-500">
                      Tamper status: {item.tamper_status ?? "unknown"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-600">
                      {item.case_id ?? "No case link"} /{" "}
                      {item.passport_id ?? "No passport link"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="Custody records are clear. Any chain-of-custody issues will appear here with review context." />
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Recent Evidence</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {evidence.map((item) => (
              <EvidenceCard key={item.id} evidence={item} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Linked Passports</h2>
            <div className="mt-5 space-y-3">
              {passports?.length ? (
                passports.map((passport) => (
                  <div
                    key={passport.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">
                      {passport.subject_name ?? "Unnamed passport"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {passport.subject_type ?? "unknown"} / Trust{" "}
                      {passport.trust_score ?? "n/a"} /{" "}
                      {passport.review_status ?? "pending"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No linked Trust Passports yet. Create a verification workflow to connect evidence with a passport record." />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Linked Verification Cases</h2>
            <div className="mt-5 space-y-3">
              {cases?.length ? (
                cases.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-black p-4"
                  >
                    <p className="font-medium text-zinc-100">
                      {item.subject_name ?? "Unnamed case"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {item.subject_type ?? "unknown"} / Trust{" "}
                      {item.trust_score ?? "n/a"} /{" "}
                      {item.verification_status ?? "pending"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState label="No linked verification cases yet. Cases will appear here when evidence is attached to an active workflow." />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
