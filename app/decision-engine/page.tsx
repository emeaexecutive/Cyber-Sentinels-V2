import Link from "next/link";
import {
  evaluateDecisionEngine,
  type DecisionEngineInput,
} from "@/lib/trust-engine/decisionEngine";

const sampleDecisions: Array<{
  label: string;
  subject: string;
  input: DecisionEngineInput;
}> = [
  {
    label: "Verified operator",
    subject: "Human identity review",
    input: {
      trust_score: 92,
      human_presence_index: 86,
      origin_trace_score: 74,
      synthetic_risk: 12,
      liveness_score: 91,
      linkedin_profile_consistency: 88,
      video_deepfake_risk: 8,
      voice_clone_risk: 11,
      image_authenticity_score: 93,
      provenance_status: "verified",
      review_status: "pending",
      suspicious_activity: false,
      abuse_risk: "low",
    },
  },
  {
    label: "Synthetic escalation",
    subject: "Video evidence review",
    input: {
      trust_score: 44,
      human_presence_index: 63,
      origin_trace_score: 52,
      synthetic_risk: 93,
      liveness_score: 48,
      linkedin_profile_consistency: 50,
      video_deepfake_risk: 91,
      voice_clone_risk: 36,
      image_authenticity_score: 57,
      provenance_status: "unverified",
      review_status: "in_review",
      suspicious_activity: false,
      abuse_risk: "medium",
    },
  },
  {
    label: "Evidence gap",
    subject: "Candidate verification",
    input: {
      trust_score: 71,
      human_presence_index: 42,
      origin_trace_score: 69,
      synthetic_risk: 24,
      liveness_score: 55,
      linkedin_profile_consistency: 61,
      video_deepfake_risk: 19,
      voice_clone_risk: 14,
      image_authenticity_score: 78,
      provenance_status: "partial",
      review_status: "pending",
      suspicious_activity: false,
      abuse_risk: "low",
    },
  },
  {
    label: "Trace anomaly",
    subject: "Content provenance",
    input: {
      trust_score: 68,
      human_presence_index: 77,
      origin_trace_score: 33,
      synthetic_risk: 39,
      liveness_score: 72,
      linkedin_profile_consistency: null,
      video_deepfake_risk: 41,
      voice_clone_risk: 17,
      image_authenticity_score: 64,
      provenance_status: "disputed",
      review_status: "pending",
      suspicious_activity: true,
      abuse_risk: "high",
    },
  },
];

function badgeClass(riskLevel: string) {
  if (riskLevel === "critical") return "border-red-700 text-red-200";
  if (riskLevel === "high") return "border-amber-700 text-amber-200";
  if (riskLevel === "medium") return "border-cyan-700 text-cyan-200";

  return "border-emerald-700 text-emerald-200";
}

export default function DecisionEnginePage() {
  const decisions = sampleDecisions.map((sample) => ({
    ...sample,
    result: evaluateDecisionEngine(sample.input),
  }));

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/command-center", "Command Center"],
            ["/policy-engine", "Policy Engine"],
            ["/evidence-vault", "Evidence Vault"],
            ["/verification-queue", "Verification Queue"],
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
            Operational decision layer
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Decision Engine&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust decisions should be explainable, logged and reviewable.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Policy Engine&trade;</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Decision recommendations are checked against governance rules
                before high-risk actions move forward.
              </p>
            </div>
            <Link
              href="/policy-engine"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Policy Engine
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Evidence Sufficiency</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Decision recommendations include whether liveness, provenance,
                profile and media evidence are strong enough for review.
              </p>
            </div>
            <Link
              href="/evidence-vault"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Evidence Vault
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {decisions.map((sample) => (
            <div
              key={sample.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{sample.subject}</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {sample.label}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${badgeClass(
                    sample.result.riskLevel
                  )}`}
                >
                  {sample.result.riskLevel}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Trust</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {sample.input.trust_score ?? "n/a"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Human Presence</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {sample.input.human_presence_index ?? "n/a"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Synthetic Risk</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {sample.input.synthetic_risk ?? "n/a"}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-zinc-900 pt-4">
                <p className="text-sm text-zinc-500">Recommended action</p>
                <p className="mt-1 text-2xl font-semibold">
                  {sample.result.recommendedAction}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm text-zinc-500">Reason codes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sample.result.reasonCodes.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
