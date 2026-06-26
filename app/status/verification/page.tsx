import Link from "next/link";

export const dynamic = "force-dynamic";

const workingNow = [
  ["Auth", "Supabase auth flow, email verification handling and protected-route redirects are implemented in the app."],
  ["Protected routes", "Dashboard, admin and workflow surfaces require authenticated access before sensitive records are shown."],
  ["Enterprise access form", "Enterprise intake is implemented through the existing enterprise access route and form."],
  ["Verification workflows", "Verification, evidence, governance, replay and receipt surfaces exist as working product flows."],
  ["Replay / receipts", "Replay chronology and verification receipts are implemented as protected workflow evidence views."],
  ["Governance review UI", "Reviewer queues, action states and escalation language are present in the governance dashboard."],
  ["Database records if connected", "When Supabase is configured, protected workflow pages read live records. This public status page does not expose those records."],
];

const ruleBasedMvp = [
  ["Session integrity flags", "Flags are review context for channel, injection, liveness or session anomalies."],
  ["Risk scoring placeholders", "Trust score output is deterministic MVP scoring, not trained detection."],
  ["Governance escalation rules", "Rules can recommend escalation when evidence, session or provider signals are incomplete or risky."],
  ["Trust journey progression", "Workflow progression is derived from existing evidence, governance, replay and receipt states."],
];

const providerBacked = [
  ["World ID", "Optional provider-backed identity signal when configured."],
  ["Hopae", "Optional identity/provider signal where integration credentials and policy allow use."],
  ["Stripe Identity", "Optional verification provider for identity workflows when configured."],
  ["Persona / Onfido future adapters", "Future adapter candidates. Not treated as implemented verification unless integration is configured and exercised."],
];

const notValidated = [
  ["Deepfake accuracy", "No independent benchmark is currently presented by Cyber Sentinels."],
  ["Liveness accuracy", "No production accuracy claim is made without provider evidence or benchmark results."],
  ["Voice clone detection", "No independent voice-clone detection claim is made."],
  ["Biometric accuracy claims", "Cyber Sentinels does not claim biometric model accuracy from the MVP scoring layer."],
];

function Section({
  title,
  intro,
  items,
}: {
  title: string;
  intro: string;
  items: string[][];
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">{intro}</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map(([label, detail]) => (
          <article key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
            <h3 className="text-sm font-semibold text-zinc-100">{label}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function VerificationStatusPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/status" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Status
          </Link>
          <Link href="/verification-receipts" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Receipts
          </Link>
          <Link href="/trust-replay" className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:text-white">
            Replay
          </Link>
        </nav>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Verification Status
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            What Cyber Sentinels can prove today.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            This page separates working software, rule-based MVP scoring, optional provider-backed verification and claims that still require independent validation.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Detection is one signal. Governance review determines final workflow state. Cyber Sentinels does not claim perfect detection.
          </p>
        </section>

        <div className="mt-8 grid gap-6">
          <Section
            title="Working Now"
            intro="Implemented product surfaces that can be exercised in the app when the environment is configured."
            items={workingNow}
          />
          <Section
            title="Rule-Based MVP"
            intro="Transparent rules that help reviewers understand workflow state. These are not trained biometric or media-authenticity models."
            items={ruleBasedMvp}
          />
          <Section
            title="Provider-Backed / Optional"
            intro="External verification can strengthen the evidence chain only when providers are configured, reachable and policy-approved."
            items={providerBacked}
          />
          <Section
            title="Not Yet Independently Validated"
            intro="Claims that require benchmarking, provider reports or independent evaluation before they should appear in product copy."
            items={notValidated}
          />
        </div>
      </div>
    </main>
  );
}
