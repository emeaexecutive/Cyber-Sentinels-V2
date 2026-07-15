import type { Metadata } from "next";
import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";

const solutionOutcomes = [
  ["ai-operations", "AI Operations", "Keep agent purpose, delegated scope and accountable ownership visible before sensitive actions proceed.", "/enterprise/agent-governance"],
  ["financial-services", "Financial Services", "Make high-value approvals explainable across evidence, authority and review."],
  ["insurance", "Insurance", "Connect claim evidence, decision ownership and governed outcomes."],
  ["healthcare", "Healthcare", "Preserve authority and review context across sensitive clinical and administrative workflows."],
  ["critical-infrastructure", "Critical Infrastructure", "Maintain accountable control across consequential human and machine operations."],
  ["vendor-access", "Vendor Access", "Verify third-party purpose, scope and session change before access continues."],
  ["privileged-operations", "Privileged Operations", "Challenge material changes before elevated actions reach protected systems."],
  ["hiring", "Hiring", "Reduce synthetic applicant and proxy-interview risk without making hiring the platform identity.", "/enterprise/hiring-security"],
] as const;

export default function SolutionsPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ExecutiveSummary
          eyebrow="Solutions"
          title="Apply operational trust where uncertainty carries business or regulatory cost."
          bullets={["Reduce ambiguity before consequential action.", "Keep accountable ownership visible.", "Escalate material change to review.", "Preserve proof for audit and challenge."]}
          primary={{ href: "/enterprise-access?intent=demo", label: "Request Enterprise Demo" }}
        />

        <section className="mt-8">
          <p className="operational-eyebrow">Workflow outcomes</p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold">One Trust Fabric, configured for different enterprise outcomes.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">Hiring is one workflow. Every workflow inherits the same identity, authority, decision, evidence and governance foundation.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {solutionOutcomes.map(([id, title, copy, href]) => {
              const content = (
                <>
                  <p className="font-mono text-xs text-cyan-300">Workflow</p>
                  <h3 className="mt-3 text-xl font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
                </>
              );
              return href ? (
                <Link id={id} key={id} href={href} className="scroll-mt-28 operational-card block p-5 hover:border-cyan-800">{content}</Link>
              ) : (
                <article id={id} key={id} className="scroll-mt-28 operational-card p-5">{content}</article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">Common outcome</p>
          <h2 className="mt-3 text-2xl font-semibold">One explainable decision record across security, risk, compliance and operations.</h2>
          <Link href="/enterprise-access?intent=demo" className="mt-6 inline-flex brand-primary-action">Request Enterprise Demo</Link>
        </section>
      </div>
    </main>
  );
}

export const metadata: Metadata = {
  title: "Enterprise Solutions | Cyber Sentinels",
  description: "Operational trust outcomes for AI operations, finance, insurance, healthcare, critical infrastructure, vendor access, privileged operations and hiring.",
  alternates: { canonical: "/solutions" },
};
