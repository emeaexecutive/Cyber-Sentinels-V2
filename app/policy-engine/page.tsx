import Link from "next/link";
import {
  activePolicies,
  evaluatePolicyEngine,
  type PolicyEngineInput,
} from "@/lib/trust-engine/policyEngine";

const policyExamples: Array<{
  label: string;
  description: string;
  input: PolicyEngineInput;
}> = [
  {
    label: "Clean approval path",
    description: "Passport, proof, audit and signal are present.",
    input: {
      requested_action: "allow",
      subject_type: "human",
      media_type: "image",
      has_trust_passport: true,
      has_human_presence_index: true,
      has_origin_trace: true,
      has_audit_log: true,
      has_signal: true,
      has_media_evidence: true,
      is_admin: true,
      human_presence_index: 88,
      origin_trace_score: 76,
      synthetic_risk: 12,
      liveness_score: 91,
      provenance_status: "verified",
      linkedin_verification_status: "verified_external",
      suspicious_activity: false,
    },
  },
  {
    label: "Proof before permission block",
    description: "A high-risk allow action is missing required proof.",
    input: {
      requested_action: "allow",
      subject_type: "candidate",
      media_type: "video",
      has_trust_passport: false,
      has_human_presence_index: true,
      has_origin_trace: false,
      has_audit_log: false,
      has_signal: true,
      has_media_evidence: false,
      is_admin: true,
      human_presence_index: 54,
      origin_trace_score: 42,
      synthetic_risk: 78,
      liveness_score: 66,
      provenance_status: "partial",
      linkedin_verification_status: "submitted",
      suspicious_activity: false,
    },
  },
  {
    label: "Manual review required",
    description: "Synthetic and LinkedIn mismatch policies require review.",
    input: {
      requested_action: "deny",
      subject_type: "candidate",
      media_type: "image",
      has_trust_passport: true,
      has_human_presence_index: true,
      has_origin_trace: true,
      has_audit_log: true,
      has_signal: true,
      has_media_evidence: true,
      is_admin: true,
      human_presence_index: 71,
      origin_trace_score: 62,
      synthetic_risk: 82,
      liveness_score: 80,
      provenance_status: "verified",
      linkedin_url: "https://linkedin.com/in/example",
      linkedin_verification_status: "mismatch",
      suspicious_activity: false,
    },
  },
  {
    label: "Evidence sufficiency warning",
    description: "Candidate verification is missing required evidence.",
    input: {
      requested_action: "manual_review",
      subject_type: "candidate",
      media_type: "audio",
      has_trust_passport: true,
      has_human_presence_index: true,
      has_origin_trace: true,
      has_audit_log: true,
      has_signal: false,
      has_media_evidence: false,
      is_admin: false,
      human_presence_index: 74,
      origin_trace_score: 69,
      synthetic_risk: 34,
      liveness_score: null,
      provenance_status: null,
      linkedin_verification_status: "unverified",
      suspicious_activity: false,
    },
  },
];

const ruleCards = [
  [
    "Proof Before Permission Policy",
    "High-risk subjects cannot be allowed without a Trust Passport, HPI, Origin Trace and audit log.",
  ],
  [
    "Human Review Policy",
    "Synthetic risk, weak HPI, weak Origin Trace, suspicious activity or LinkedIn mismatch require manual review.",
  ],
  [
    "Evidence Sufficiency Policy",
    "Missing liveness, provenance, candidate LinkedIn or video/audio evidence requests more evidence.",
  ],
  [
    "Admin Decision Policy",
    "Only admins can approve or reject high-risk cases.",
  ],
  [
    "Audit Policy",
    "Every decision must produce an audit log and a signal.",
  ],
];

function badgeClass(result: string) {
  if (result === "fail") return "border-red-700 text-red-200";
  if (result === "warning") return "border-amber-700 text-amber-200";

  return "border-emerald-700 text-emerald-200";
}

export default function PolicyEnginePage() {
  const examples = policyExamples.map((example) => ({
    ...example,
    result: evaluatePolicyEngine(example.input),
  }));

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/admin", "Admin"],
            ["/command-center", "Command Center"],
            ["/decision-engine", "Decision Engine"],
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
            Trust governance
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Policy Engine&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust is not a feeling. It is a rule set.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-5">
          {activePolicies.map((policy) => (
            <div
              key={policy}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm font-medium text-zinc-100">{policy}</p>
              <p className="mt-3 text-xs text-emerald-200">Active</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                Evidence Sufficiency Policy
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                The Policy Engine checks the Evidence Vault for liveness,
                provenance, profile links and media artefacts before trust
                actions advance.
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
          {examples.map((example) => (
            <div
              key={example.label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{example.label}</h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    {example.description}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${badgeClass(
                    example.result.policy_result
                  )}`}
                >
                  {example.result.policy_result}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Policy action</p>
                  <p className="mt-1 text-lg font-semibold">
                    {example.result.policy_action}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Synthetic risk</p>
                  <p className="mt-1 text-lg font-semibold">
                    {example.input.synthetic_risk ?? "n/a"}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-black p-3">
                  <p className="text-xs text-zinc-500">Human Presence</p>
                  <p className="mt-1 text-lg font-semibold">
                    {example.input.human_presence_index ?? "n/a"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-zinc-500">Reason codes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {example.result.reason_codes.length ? (
                    example.result.reason_codes.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                      >
                        {reason}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-emerald-700 px-2.5 py-1 text-xs text-emerald-200">
                      policy_passed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {ruleCards.map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
