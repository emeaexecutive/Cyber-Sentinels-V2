import Link from "next/link";

const enterpriseQuestions = [
  ["Can trust decisions be explained later?", "Yes: evidence, reviewer action, authorization context and outcome history remain connected for review."],
  ["Who is accountable when AI agents act?", "Human ownership, declared purpose, delegated authority and governance state stay visible."],
  ["How does this fit existing systems?", "Cyber Sentinels adds a trust record beside systems of record rather than replacing them."],
];

const buyerOutcomes = [
  "Reduce ambiguity in regulated workflows.",
  "Give security, risk, compliance and operations a shared evidence record.",
  "Preserve review context after runtime sessions and provider interactions end.",
  "Pilot one workflow without committing to broad platform replacement.",
];

const enterpriseReadiness = [
  ["deployment", "Deployment", "Pilot-scoped rollout, environment readiness and controlled production gates."],
  ["compliance", "Compliance", "Evidence continuity and review records that support customer control mapping."],
  ["sso-scim", "SSO / SCIM", "Enterprise identity integration remains subject to deployment configuration and verification."],
  ["data-residency", "Data Residency", "Regional, retention and provider guarantees are verified for each deployment rather than assumed."],
  ["support", "Enterprise Support", "Named operational ownership for onboarding, escalation and evidence review."],
  ["architecture", "Architecture", "A trust control plane beside systems of record, with bounded provider and workflow integrations."],
  ["procurement", "Procurement / Legal Readiness", "Security, privacy, legal and capability-boundary materials for buyer review."],
];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Enterprise</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Enterprise clarity for governed human and machine work.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels helps enterprise teams explain high-consequence workflow outcomes when identity, authority, evidence and AI-assisted activity change over time.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/enterprise-access" className="brand-primary-action brand-action-large text-sm">
              Request Enterprise Access
            </Link>
            <Link href="/solutions" className="brand-secondary-action brand-action-large text-sm">
              View Solutions
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {enterpriseQuestions.map(([title, body]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </section>

        <section className="operational-panel mt-8 p-6">
          <p className="operational-eyebrow">Enterprise outcomes</p>
          <h2 className="mt-3 text-2xl font-semibold">
            Start with the workflow where review confidence matters most.
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {buyerOutcomes.map((outcome) => (
              <div key={outcome} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-300">
                {outcome}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Deployment and buying readiness</p>
          <h2 className="mt-3 text-2xl font-semibold">Enterprise controls without duplicated product explanations.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {enterpriseReadiness.map(([id, title, copy]) => (
              <article id={id} key={id} className="scroll-mt-28 operational-card p-5">
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/security" className="brand-secondary-action">Security</Link>
            <Link href="/enterprise/pilot" className="brand-secondary-action">Pilot Programme</Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Need the architecture?</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Platform owns the product model. Trust Center owns replay, provider transparency and public trust boundaries.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/platform" className="brand-secondary-action">Platform</Link>
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/trust#trust-memory" className="brand-secondary-action">Trust Memory\u2122</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
