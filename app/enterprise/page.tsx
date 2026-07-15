import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const buyerQuestions = [
  ["Can decisions be explained later?", "Evidence, authority, reviewer action and outcome remain connected."],
  ["Who owns an AI-agent action?", "Human accountability, purpose and delegated scope remain visible."],
  ["Will this replace existing systems?", "No. Cyber Sentinels adds a governed trust layer beside systems of record."],
];

const readiness = [
  ["deployment", "Deployment", "Pilot scope, environments, production gates and operational ownership."],
  ["compliance", "Compliance", "Evidence continuity and review records for customer control mapping."],
  ["sso-scim", "SSO / SCIM", "Enterprise identity integration verified for the selected deployment."],
  ["data-residency", "Data Residency", "Regional, retention and provider boundaries agreed before production."],
  ["support", "Enterprise Support", "Named owners for onboarding, escalation and evidence review."],
  ["procurement", "Procurement & Legal", "Security, privacy, capability and contractual boundaries ready for review."],
];

const adoptionSteps = ["Choose one workflow", "Agree evidence and authority", "Validate in pilot", "Review production gates"];

export default function EnterprisePage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Enterprise"
          title="Adopt operational trust one governed workflow at a time."
          bullets={["Deploy beside existing systems.", "Give security, risk and compliance one evidence record.", "Assign every escalation to an owner.", "Verify production boundaries before launch."]}
          primary={{ href: "/enterprise/pilot", label: "Start Pilot" }}
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          {buyerQuestions.map(([title, body]) => (
            <article key={title} className="operational-card p-5">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Controlled adoption</p>
          <h2 className="mt-3 text-2xl font-semibold">A bounded path from workflow selection to production review.</h2>
          <ol className="mt-6 grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 md:grid-cols-4">
            {adoptionSteps.map((step, index) => (
              <li key={step} className="bg-black p-5">
                <p className="font-mono text-xs text-cyan-300">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold text-zinc-100">{step}</h3>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Deployment and buying readiness</p>
          <h2 className="mt-3 text-2xl font-semibold">The controls enterprise stakeholders need to proceed.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {readiness.map(([id, title, copy]) => (
              <article id={id} key={id} className="scroll-mt-28 operational-card p-5">
                <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
          <Link href="/security" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-white">Review security controls →</Link>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise | Cyber Sentinels",
  description: "Deployment, security, compliance, data residency, pilot adoption, procurement and enterprise support.",
  alternates: { canonical: "/enterprise" },
};
