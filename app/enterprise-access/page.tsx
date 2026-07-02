import Link from "next/link";
import { TurnstileField } from "@/components/turnstile-field";
import { getTurnstileSiteKey } from "@/lib/bot-protection";
import { EvidenceDisclaimer } from "@/components/evidence-disclaimer";
import { operationalPilotTemplates } from "@/lib/pilot-templates";

export const dynamic = "force-dynamic";

export default async function EnterpriseAccessPage({ searchParams }: {
  searchParams?: Promise<{ success?: string; error?: string; intent?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const designPartner = query.intent === "design_partner";
  const introCall = query.intent === "intro_call";
  const turnstileSiteKey = getTurnstileSiteKey();
  const pageTitle = designPartner
    ? "Become a Design Partner"
    : introCall
      ? "Book Intro Call"
      : "Request Enterprise Access";
  const buttonLabel = designPartner
    ? "Become a Design Partner"
    : introCall
      ? "Book Intro Call"
      : "Request Enterprise Access";

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
        <section className="border-b border-zinc-800 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise Access</p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{pageTitle}</h1>
          <p className="mt-5 max-w-2xl leading-8 text-zinc-300">Tell us which human, AI-agent or enterprise workflow needs continuous trust, accountable authorization and replayable governance.</p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300">Cyber Sentinels provides persistent Operational Trust through Continuous Verification, Trust Posture, Evidence Chain, Authorization Lineage, Governance Review and Replay Timeline.</p>
          {designPartner ? (
            <div className="mt-6 rounded-lg border border-cyan-950 bg-black p-4">
              <p className="text-sm font-semibold text-cyan-100">Design partner pilot ask</p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-300">
                <li>Select one human, AI-agent or enterprise workflow.</li>
                <li>Define its identity, evidence and authorization boundary.</li>
                <li>Review Trust Posture shifts and Replay Timeline continuity.</li>
                <li>Evaluate governance ownership and the final receipt.</li>
              </ul>
            </div>
          ) : null}
          <div className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-sm font-semibold text-zinc-100">Operational pilot expectations</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Select one workflow, identify its review owner, agree the evidence boundary,
              review governance and replay together, then evaluate the final receipt with stakeholders.
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Supported: {operationalPilotTemplates.map((template) => template.name).join(" · ")}
            </p>
          </div>
          <EvidenceDisclaimer className="mt-6 max-w-2xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Persistent Trust Posture", "Operational state remains visible as identity, authorization, session and evidence change."],
              ["Governance escalation", "Human authority remains attached to the workflow transition and its rationale."],
              ["Replay continuity", "Replay Timeline, receipts and audit references preserve what changed and why."],
              ["Governed execution", "Teams can see whether human or agent activity is authorized, restricted or awaiting review."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-800 bg-black p-3">
                <p className="text-xs font-semibold text-zinc-100">{title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-300">{copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/demo" className="brand-primary-action">View Demo</Link>
            <Link href="/demo/hiring-attack" className="rounded-md border border-cyan-900 px-4 py-2 text-cyan-200">Hiring Security</Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-md border border-zinc-700 px-4 py-2">Become a Design Partner</Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-md border border-zinc-700 px-4 py-2">Book Intro Call</Link>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          {query.success ? <p className="mb-5 rounded-md border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-100">Your request has been received. We will follow up about pilot fit and next steps.</p> : null}
          {query.error ? <p className="mb-5 rounded-md border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">Please check the required fields and try again.</p> : null}
          <form action="/api/enterprise-access" method="post" className="grid gap-4">
            <input type="hidden" name="design_partner_interest" value={designPartner ? "true" : "false"} />
            <label className="grid gap-2 text-sm text-zinc-300">Name<input required name="name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Work email<input required name="work_email" type="email" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">Company<input required name="company" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Operational trust concern
              <select name="current_problem_category" defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
                <option value="" disabled>Select the closest concern</option>
                <option value="ai_identity">AI-agent governance and authorization</option>
                <option value="auditability">Replay continuity and Evidence Chain</option>
                <option value="human_review">Governance Review and escalation</option>
                <option value="session_integrity">Continuous Verification and Session Integrity</option>
                <option value="hiring_security">Hiring Security workflow</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">Requirements<textarea name="message" rows={5} placeholder="Workflow, verification evidence, review or pilot requirements" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
            <TurnstileField siteKey={turnstileSiteKey} />
            <button className="brand-primary-action w-full p-3">{buttonLabel}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
