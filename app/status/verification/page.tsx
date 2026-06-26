import Link from "next/link";
import { getVerificationProviderRegistry } from "@/lib/providers";

export const dynamic = "force-dynamic";

const workingNow = [
  ["Auth", "Supabase auth flow, email verification handling and protected-route redirects are implemented in the app."],
  ["Protected routes", "Dashboard, admin and workflow surfaces require authenticated access before sensitive records are shown."],
  ["Enterprise access form", "Enterprise intake is implemented through the existing enterprise access route and form."],
  ["Verification workflows", "Verification, evidence, governance, replay and receipt surfaces exist as working product flows. They do not prove provider accuracy by themselves."],
  ["Replay / receipts", "Replay chronology and verification receipts are implemented as protected workflow evidence views and can read database records when connected."],
  ["Governance review UI", "Reviewer queues, action states and escalation language are present in the governance dashboard."],
  ["Database records if connected", "When Supabase is configured, protected workflow pages read live records. This public status page does not expose those records."],
];

const ruleBasedMvp = [
  ["Session integrity flags", "Flags are review context for channel, injection, liveness or session anomalies. Detection is one signal."],
  ["Risk scoring placeholders", "Trust score output is deterministic MVP scoring, not trained detection."],
  ["Governance escalation rules", "Rules can recommend escalation when evidence, session or provider signals are incomplete or risky."],
  ["Trust journey progression", "Workflow progression is derived from existing evidence, governance, replay and receipt states."],
  ["/verify/candidate", "Creates candidate records, reports, audit signals and receipts from submitted workflow data. It does not call a live identity provider today."],
  ["/verify/session", "Records operator-entered session integrity review and persists rule-based signals. It does not call a live biometric, liveness or deepfake provider today."],
];

const providerBacked = [
  ["World ID", "A protected endpoint accepts proof-shaped payloads and reports whether `WORLD_ACTION` is configured, but backend World ID verification is still a placeholder."],
  ["Stripe Identity", "Provider registry support exists. No live Stripe Identity session lifecycle is wired into candidate or session workflows today."],
  ["Persona / Entrust / Onfido", "Placeholder adapters only. They normalize future evidence but do not perform provider verification today."],
  ["Cloudflare Turnstile", "Real bot-protection support exists for configured forms. It is a session/form integrity signal, not identity verification."],
  ["Fingerprint / device trust", "Placeholder device-risk provider entry. Current session/device evidence is rule-based or operator-entered unless a provider signal is attached externally."],
  ["Receipts and replay", "Can show normalized provider evidence when present in workflow snapshots. They do not fetch new provider results on their own."],
];

const notValidated = [
  ["Deepfake accuracy", "No independent benchmark is currently presented by Cyber Sentinels."],
  ["Liveness accuracy", "No production accuracy claim is made without provider evidence or benchmark results."],
  ["Voice clone detection", "No independent voice-clone detection claim is made."],
  ["Biometric accuracy claims", "Cyber Sentinels does not claim biometric model accuracy from the MVP scoring layer."],
  ["Real/fake detection", "Cyber Sentinels does not claim perfect real/fake detection."],
];

const workflowAudit = [
  ["/trust/session/[id]", "Reads live Supabase session, integrity, signal, risk, governance and receipt records for the authenticated owner. Provider evidence is not fetched live."],
  ["Verification receipts", "Persist workflow summaries and evidence snapshots. Provider fields are replayed if attached; otherwise the receipt reflects app workflow evidence."],
  ["Replay", "Shows chronology, reviewer actions, risk events, trust score changes and provider evidence when it exists. Replay does not independently verify a provider result."],
  ["/admin/test-lab", "Uses controlled scenarios. These include simulated provider-backed signals, failed provider tests and missing evidence warnings; they are not live benchmark results."],
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
  const providers = getVerificationProviderRegistry();

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
            Detection is one signal. Cyber Sentinels does not claim perfect real/fake detection. Final workflow trust state depends on provider evidence, governance review and replay.
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
            title="Provider-Backed"
            intro="External verification can strengthen the evidence chain only when providers are configured, reachable, policy-approved and actually exercised."
            items={providerBacked}
          />
          <Section
            title="Workflow Audit"
            intro="Where current verification routes use live records, mock/demo data, rule inputs or provider evidence."
            items={workflowAudit}
          />
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold text-white">Provider Integration Status</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
              Status is derived from configured environment variables and the current provider registry. Missing optional providers are treated as safely disabled or future placeholders.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {providers.map((provider) => (
                <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-zinc-100">{provider.name}</h3>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                      {provider.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{provider.notes}</p>
                  <p className="mt-3 text-xs leading-5 text-zinc-600">
                    Evidence reference: {provider.evidenceReference}
                  </p>
                </article>
              ))}
            </div>
          </section>
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
