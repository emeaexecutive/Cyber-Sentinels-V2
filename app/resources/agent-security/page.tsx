import type { Metadata } from "next";
import Link from "next/link";
import { StructuredData } from "@/components/search/structured-data";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, publicSocialMetadata } from "@/lib/search/metadata";
import { RESOURCE_ROOT, conceptDestinations, securityResources } from "@/lib/search/resources";

const title = "AI Agent Security: Authority, Tools and Evidence | Cyber Sentinels";
const description = "Understand AI agent authorization, delegation, runtime authority, MCP tool boundaries and audit evidence, with implementation limits made explicit.";
export const metadata: Metadata = { title, description, alternates: { canonical: RESOURCE_ROOT }, ...publicSocialMetadata(title, description, RESOURCE_ROOT) };

export default function AgentSecurityHub() {
  return <main className="operational-shell min-h-screen px-4 py-12 text-white sm:px-6 md:px-8">
    <div className="mx-auto max-w-6xl">
      <StructuredData value={{ "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${SITE_URL}${RESOURCE_ROOT}#hub`, url: `${SITE_URL}${RESOURCE_ROOT}`, name: title, description,
        isPartOf: { "@id": WEBSITE_ID }, publisher: { "@id": ORGANIZATION_ID }, hasPart: securityResources.map((resource) => ({ "@id": `${SITE_URL}${RESOURCE_ROOT}/${resource.slug}#article` })) }} />
      <header className="max-w-4xl border-b border-zinc-800 pb-10">
        <p className="operational-eyebrow">Technical knowledge hub</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">AI agent security: authority before action</h1>
        <p className="mt-6 text-lg leading-8 text-zinc-200">AI agent security includes controlling what an agent may cause, not only authenticating its connection. Evaluate the actor, current authority, purpose, target, action and policy before execution, then preserve the evidence behind the decision.</p>
        <p className="mt-4 text-base leading-8 text-zinc-400">Cyber Sentinels determines whether an autonomous agent is authorized to act and preserves the evidence explaining why. These resources explain execution trust, its implementation boundaries and the questions an enterprise should be able to answer.</p>
      </header>
      <section className="mt-10" aria-labelledby="guides-title">
        <h2 id="guides-title" className="text-2xl font-semibold">Start with the decision you need to control</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">{securityResources.map((resource, index) => <article key={resource.slug} className="operational-panel flex flex-col p-6">
          <p className="font-mono text-xs text-cyan-300">0{index + 1} · EXPLAINED</p><h3 className="mt-4 text-2xl font-semibold leading-8"><Link href={`${RESOURCE_ROOT}/${resource.slug}`} className="underline decoration-zinc-700 underline-offset-4">{resource.title}</Link></h3>
          <p className="mt-4 text-sm leading-7 text-zinc-400">{resource.description}</p>
        </article>)}</div>
      </section>
      <section className="mt-12 rounded-xl border border-zinc-800 bg-black p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">One control chain, distinct responsibilities</h2>
        <p className="mt-4 text-base leading-8 text-cyan-100">Agent Registry → Authority → Policy → Decision → Receipt → Replay → Trust Memory™</p>
        <p className="mt-4 max-w-4xl leading-8 text-zinc-300">Identity is not authority. ALLOW authorizes the evaluated action; REVIEW and DENY stop execution. A receipt records a decision, not proof that a provider performed the action. Replay reconstructs the chronology, while Trust Memory retains material changes without turning previous permission into permanent authority.</p>
        <p className="mt-4 leading-8 text-zinc-400">For implementation, read the <Link className="text-cyan-200 underline" href="/developers/quickstart">agent lifecycle tutorial</Link>, <Link className="text-cyan-200 underline" href="/developers/api-reference">public API reference</Link> and <Link className="text-cyan-200 underline" href="/documents/operational-trust-whitepaper">operational trust whitepaper</Link>. Educational examples are illustrative; provider readiness and external enforcement must be evaluated separately.</p>
      </section>
      <section className="mt-12" aria-labelledby="concepts-title">
        <h2 id="concepts-title" className="text-2xl font-semibold">Find the canonical explanation</h2>
        <dl className="mt-6 grid gap-x-8 md:grid-cols-2">{conceptDestinations.map(([concept, href]) => <div key={concept} className="border-b border-zinc-800 py-5"><dt className="text-base font-medium text-zinc-100">{concept}</dt><dd className="mt-2"><Link href={href} className="text-sm text-cyan-200 underline underline-offset-4">Read the explanation<span className="sr-only"> of {concept}</span></Link></dd></div>)}</dl>
      </section>
    </div>
  </main>;
}
