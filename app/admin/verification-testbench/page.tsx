import Link from "next/link";
import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import {
  calculateTransparentTrustScore,
  type TransparentTrustScoreInput,
} from "@/lib/trust-score";

export const dynamic = "force-dynamic";

type TestCase = {
  id: string;
  label: string;
  summary: string;
  input: TransparentTrustScoreInput;
};

const testCases: TestCase[] = [
  {
    id: "normal-session",
    label: "Real human / normal session",
    summary: "Complete evidence, stable session integrity and approved governance review.",
    input: {
      identityConfidence: 88,
      sessionIntegrity: 90,
      evidenceCompleteness: 86,
      governanceReview: "approved",
      providerVerification: "none",
      riskFlags: [],
    },
  },
  {
    id: "missing-evidence",
    label: "Missing evidence",
    summary: "Identity context exists, but required evidence is incomplete.",
    input: {
      identityConfidence: 72,
      sessionIntegrity: 76,
      evidenceCompleteness: 34,
      governanceReview: "pending",
      providerVerification: "none",
      riskFlags: ["missing_evidence"],
    },
  },
  {
    id: "session-injection-risk",
    label: "Session injection risk",
    summary: "Session integrity is reduced by a channel or injected-feed risk flag.",
    input: {
      identityConfidence: 76,
      sessionIntegrity: 38,
      evidenceCompleteness: 70,
      governanceReview: "escalated",
      providerVerification: "pending",
      riskFlags: ["session_integrity_anomaly", "injection_risk"],
    },
  },
  {
    id: "proxy-candidate-risk",
    label: "Proxy candidate risk",
    summary: "Candidate context and interview-session behavior do not line up cleanly.",
    input: {
      identityConfidence: 64,
      sessionIntegrity: 48,
      evidenceCompleteness: 62,
      governanceReview: "escalated",
      providerVerification: "none",
      riskFlags: ["proxy_candidate_risk", "high_risk_context"],
    },
  },
  {
    id: "failed-governance-review",
    label: "Failed governance review",
    summary: "Reviewer outcome blocks the workflow regardless of partial evidence.",
    input: {
      identityConfidence: 66,
      sessionIntegrity: 70,
      evidenceCompleteness: 74,
      governanceReview: "rejected",
      providerVerification: "none",
      riskFlags: ["failed_governance_review"],
    },
  },
  {
    id: "verified-provider-signal",
    label: "Verified provider signal",
    summary: "Provider verification strengthens the evidence chain while governance remains authoritative.",
    input: {
      identityConfidence: 86,
      sessionIntegrity: 82,
      evidenceCompleteness: 88,
      governanceReview: "approved",
      providerVerification: "verified",
      riskFlags: [],
    },
  },
];

function toneClass(level: string) {
  if (level === "blocked") return "border-red-800 text-red-200";
  if (level === "low") return "border-amber-800 text-amber-200";
  if (level === "moderate") return "border-cyan-800 text-cyan-200";
  return "border-emerald-800 text-emerald-200";
}

export default async function VerificationTestbenchPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/admin/verification-testbench");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/admin/verification-testbench" });

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-medium text-emerald-300">
            Admin Access Verified
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                Verification Testbench
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Proof it works without pretending it detects everything.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                These safe demo cases exercise the transparent rule-based MVP scoring model. They do not create database records, call providers or claim biometric, liveness, voice clone or deepfake accuracy.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Detection is one signal. Governance review determines final workflow state. Cyber Sentinels does not produce a standalone detection verdict.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/status/verification" className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Public verification status
              </Link>
              <Link href="/admin/runtime-validation" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100 hover:text-white">
                Runtime validation
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5">
          {testCases.map((testCase) => {
            const result = calculateTransparentTrustScore(testCase.input);

            return (
              <article key={testCase.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">{testCase.label}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                      {testCase.summary}
                    </p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${toneClass(result.level)}`}>
                    {result.level}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr_1fr]">
                  <section className="rounded-lg border border-zinc-800 bg-black p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Inputs</h3>
                    <div className="mt-3 grid gap-2 text-sm text-zinc-400">
                      <p>Identity confidence: {testCase.input.identityConfidence}</p>
                      <p>Session integrity: {testCase.input.sessionIntegrity}</p>
                      <p>Evidence completeness: {testCase.input.evidenceCompleteness}</p>
                      <p>Governance review: {testCase.input.governanceReview}</p>
                      <p>Provider verification: {testCase.input.providerVerification ?? "none"}</p>
                    </div>
                  </section>

                  <section className="rounded-lg border border-zinc-800 bg-black p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        Calculated Trust Score
                      </h3>
                      <p className="text-3xl font-semibold text-white">{result.score}</p>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      {Object.entries(result.breakdown).map(([label, value]) => (
                        <p key={label}>
                          {label.replace(/([A-Z])/g, " $1").toLowerCase()}: {value}
                        </p>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border border-zinc-800 bg-black p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Recommended Action</h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      {result.recommendedAction}
                    </p>
                  </section>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <section className="rounded-lg border border-zinc-800 bg-black p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Flags Triggered</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.flagsTriggered.length ? (
                        result.flagsTriggered.map((flag) => (
                          <span key={flag} className="rounded-full border border-amber-800 px-2.5 py-1 text-xs text-amber-200">
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200">
                          No rule-based flags
                        </span>
                      )}
                    </div>
                  </section>

                  <section className="rounded-lg border border-zinc-800 bg-black p-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Evidence Generated</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.evidenceGenerated.map((item) => (
                        <span key={item} className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
