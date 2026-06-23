import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";
import { TurnstileField } from "@/components/turnstile-field";
import { getTurnstileSiteKey } from "@/lib/bot-protection";

export const dynamic = "force-dynamic";

export default async function EnterpriseAccessPage({ searchParams }: {
  searchParams?: Promise<{ success?: string; error?: string; intent?: string }>;
}) {
  const query = searchParams ? await searchParams : {};
  const designPartner = query.intent === "design_partner";
  const turnstileSiteKey = getTurnstileSiteKey();

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
        <section className="border-b border-zinc-800 pb-10 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Enterprise Access</p>
          <PrivateBetaBadge className="mt-4" />
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">{designPartner ? "Request Design Partner Access" : "Request Enterprise Access"}</h1>
          <p className="mt-5 max-w-2xl leading-8 text-zinc-300">Tell us what you need to verify, which workflow is exposed and what human review or audit trail your team requires.</p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">Identity verification is one signal. Cyber Sentinels adds session integrity, evidence, governance and human review.</p>
          <PrivateBetaNotice className="mt-6 max-w-2xl" />
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/demo" className="rounded-md border border-zinc-700 px-4 py-2">View Demo</Link>
            <Link href="/demo/hiring-attack" className="rounded-md border border-cyan-900 px-4 py-2 text-cyan-200">Hiring Attack Demo</Link>
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
              AI, hiring or security concern
              <select name="current_problem_category" defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
                <option value="" disabled>Select the closest concern</option>
                <option value="hiring_security">Synthetic applicants and hiring security</option>
                <option value="session_integrity">Session integrity and injected feeds</option>
                <option value="ai_identity">AI agents and digital identity</option>
                <option value="auditability">Evidence and audit trails</option>
                <option value="human_review">Governance and human review</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">Requirements<textarea name="message" rows={5} placeholder="Workflow, evidence, review or pilot requirements" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
            <TurnstileField siteKey={turnstileSiteKey} />
            <button className="rounded-lg bg-white p-3 font-semibold text-black hover:bg-cyan-100">Request Enterprise Access</button>
          </form>
        </section>
      </div>
    </main>
  );
}
