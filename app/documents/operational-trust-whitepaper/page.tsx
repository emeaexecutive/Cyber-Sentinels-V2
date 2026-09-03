import type { Metadata } from "next";
import Link from "next/link";
import { ArchitectureBlock, TrustFlow, VisualFrame } from "@/components/enterprise-visuals";

const lifecycle = [
  { label: "API client", detail: "A tenant- and client-bound key with least-privilege scopes." },
  { label: "Agent identity", detail: "Registration, credential, manifest, challenge and Ed25519 proof." },
  { label: "Authority", detail: "An accountable grantor defines action, target, purpose, environment and time." },
  { label: "Current evaluation", detail: "Identity, authority, policy and evidence are checked for this request." },
  { label: "Decision lineage", detail: "ALLOW, REVIEW or DENY is preserved with receipt and Replay references." },
];

const sections = [
  ["01", "From access control to operational trust", "Credentials answer whether a principal can reach a service. Operational trust asks whether a verified agent is currently authorized for this exact consequential action, target, purpose and environment."],
  ["02", "The operational trust problem", "Identity, authority, present admissibility and accountability are separate assurance problems. The control plane should not be the only system proving that its own control worked."],
  ["03", "Agent identity and proof", "Registration is not verification. Verification uses a one-time challenge and Ed25519 proof of key possession, while private-key material remains outside Cyber Sentinels."],
  ["04", "Authority Graph", "A versioned grant connects an accountable grantor, verified operational entity, actions, targets, purpose, environment and expiry. An agent cannot self-grant."],
  ["05", "Consequence-time authorization", "Every consequential request receives a current evaluation. A previous ALLOW is historical evidence, never standing authorization."],
  ["06", "ALLOW / REVIEW / DENY", "ALLOW authorizes the evaluated request, REVIEW requires accountable intervention or evidence, and DENY means the action is not authorized. None proves downstream execution."],
  ["07", "Evidence independence", "Agent assertions, provider observations, control-plane acknowledgements and independently observed outcomes retain distinct provenance and cannot silently upgrade one another."],
  ["08", "Receipt, Replay and Trust Memory", "Stable identifiers and integrity-linked records preserve what was decided, which versions were active, what evidence existed and how later events extended the lineage."],
  ["09", "Provider-neutral architecture", "Supabase and Turnstile are working Production dependencies. Hopae and OpenAI are partial within stated boundaries; World ID and Stripe Identity remain roadmap placeholders."],
  ["10", "Security and deployment", "Shown-once hashed API keys, scoped access, rotation, revocation, tenant isolation, rate limiting, forward migrations and safe logs form the V1 operating boundary."],
  ["11", "Current product reality", "The Production API and core trust lifecycle are working. Conditional review, richer provider proof, advanced reporting and arbitrary third-party enforcement are partial or roadmap."],
  ["12", "Accountable autonomy", "The V1 foundation combines identity without self-assertion, authority without silent expansion, current decisions without standing permission and evidence without execution overclaim."],
] as const;

const capabilityRows = [
  ["WORKING", "External OpenAPI 3.1 API; scoped API-key authentication; agent registration and Ed25519 proof; bounded authority; ALLOW / REVIEW / DENY; receipts; Replay; Trust Memory; tenant isolation; idempotency; rate limiting; approve/reject review."],
  ["PARTIAL", "Conditional review representation; Hopae provider operation; optional OpenAI governance assistance; Operations Console and reporting depth."],
  ["ROADMAP", "World ID and Stripe Identity verification; arbitrary third-party kill/quarantine automation; advanced anomaly intelligence; private or on-premises deployment."],
] as const;

export default function OperationalTrustWhitepaperPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <article className="mx-auto max-w-5xl">
        <header className="border-b border-zinc-800 pb-10">
          <p className="operational-eyebrow">Cyber Sentinels technical whitepaper · Version 1.0</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">Operational Trust Infrastructure for Autonomous Systems</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">An API-first decision and evidence layer for verifying agent identity, evaluating bounded current authority, and preserving accountable operational lineage.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a className="brand-primary-action min-h-11 justify-center whitespace-normal text-center" href="/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf" download>Download Cyber Sentinels whitepaper PDF</a>
            <Link className="brand-secondary-action min-h-11 justify-center" href="/developers/docs">Inspect the API</Link>
          </div>
        </header>

        <section className="py-10">
          <p className="operational-eyebrow">Executive abstract</p>
          <h2 className="mt-3 text-3xl font-semibold">A current trust decision before consequential action.</h2>
          <div className="mt-5 grid gap-5 text-base leading-8 text-zinc-400 md:grid-cols-2">
            <p>AI agents can call tools, change repositories, move data and initiate regulated workflows. Existing identity and access controls remain essential, but a valid credential does not establish that the current action matches the operator&apos;s intent, present authority or required evidence.</p>
            <p>Cyber Sentinels evaluates that boundary. The canonical result is ALLOW, REVIEW or DENY, attached to stable authority, policy, evidence, receipt and Replay references. Authorization remains distinct from downstream execution and observed outcome.</p>
          </div>
        </section>

        <VisualFrame eyebrow="V1 control path" title="Separate identity, authority, decision and evidence." caption="Conceptual architecture; the Production API exposes each state as a distinct resource and transition.">
          <TrustFlow steps={lifecycle} ariaLabel="Operational trust lifecycle" />
        </VisualFrame>

        <section className="mt-10">
          <ArchitectureBlock inputs={["AI agent", "Machine identity", "Regulated workflow"]} core="Operational trust layer" outputs={["Current authorization", "Evidence lineage", "Accountable reconstruction"]} />
        </section>

        <section className="mt-12 border-y border-zinc-800 py-10">
          <p className="operational-eyebrow">Product boundary</p>
          <blockquote className="mt-4 max-w-4xl text-2xl font-semibold leading-9 text-white">An ALLOW decision is authorization for one specific action in one specific context. It is not proof that a downstream system executed that action or that the intended real-world consequence occurred.</blockquote>
        </section>

        <section className="py-12">
          <p className="operational-eyebrow">Technical argument</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {sections.map(([number, title, copy]) => (
              <section key={number} className="rounded-xl border border-zinc-800 bg-black/50 p-5">
                <p className="font-mono text-xs text-cyan-300">{number}</p>
                <h2 className="mt-2 text-xl font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{copy}</p>
              </section>
            ))}
          </div>
        </section>

        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Current product reality</p>
          <h2 className="mt-3 text-3xl font-semibold">Capability state is explicit.</h2>
          <div className="mt-6 grid gap-3">
            {capabilityRows.map(([state, detail]) => (
              <div key={state} className="grid gap-2 rounded-lg border border-zinc-800 bg-black p-4 sm:grid-cols-[7rem_1fr] sm:gap-5">
                <strong className={state === "WORKING" ? "text-emerald-300" : state === "PARTIAL" ? "text-amber-200" : "text-zinc-400"}>{state}</strong>
                <p className="text-sm leading-6 text-zinc-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-zinc-800 pt-8">
          <p className="text-sm leading-7 text-zinc-400">The complete 20-section edition includes route inventory, API-key boundaries, review semantics, provider matrix, deployment architecture and verification references.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a className="brand-primary-action min-h-11 justify-center whitespace-normal text-center" href="/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf" download>Download Cyber Sentinels whitepaper PDF</a>
            <Link className="brand-secondary-action min-h-11 justify-center" href="/documents">All documents</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Cyber Sentinels Operational Trust Whitepaper",
  description: "Technical overview of Cyber Sentinels' operational trust control layer for AI agents, identity, delegated authority, policy decisions, evidence, receipts and Replay.",
  alternates: { canonical: "/documents/operational-trust-whitepaper" },
  openGraph: {
    title: "Operational Trust Infrastructure for Autonomous Systems",
    description: "The Cyber Sentinels V1 technical whitepaper.",
    type: "article",
    url: "/documents/operational-trust-whitepaper",
  },
};
