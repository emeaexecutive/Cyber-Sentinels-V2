import Link from "next/link";
import { ExecutiveSummary } from "@/components/executive-summary";
import { epic2627CrossEpicScenario } from "@/src/lib/trust-fabric/cross-epic-scenario";

const demoSequence = ["Acting identity","Verified identity","Authority","Declared environment","Observed environment","Permitted scope","Decision evidence","Trust-state change","Incident opened","Containment requested","Containment confirmed","Reviewer decision","Corrective action","Full Replay"];

export default function DemoPage(){const scenario=epic2627CrossEpicScenario();const demonstrationContract = [
  ["Who or what acted?", "A named subject with canonical identity and accountable ownership."],
  ["What identity was verified?", `${scenario.trustFabric.identity.subject.displayName} is linked to ${scenario.trustFabric.identity.identityReference.id}; only the referenced canonical identity decision is projected.`],
  ["What authority existed?", "The active grant and Authority Lineage in force for the workflow."],
  ["What environment was declared?", `The execution context declared ${scenario.scope.input.declaration.environmentClass}; this remains an assertion.`],
  ["What environment was observed?", `Independent attestation observed ${scenario.scope.input.attestations[0]?.observedEnvironmentClass}; it does not overwrite the declaration.`],
  ["What scope was permitted?", "The existing scope lease defines actions, targets, providers and expiry."],
  ["What evidence supported the decision?", "Attributed references in the canonical Evidence Graph."],
  ["Why did trust change?", "Deterministic reason codes connect critical environment contradictions to scope revocation and suspended or revoked trust."],
  ["Was an incident opened?", `Yes. Incident ${scenario.incident.id} references the canonical Scope Continuity decision and evidence snapshot.`],
  ["What containment was requested?", "Runtime isolation and authority rotation were requested as bounded operational actions."],
  ["What containment was confirmed?", "None. The provider acknowledged the request, but confirmation and independent confirmation remain absent."],
  ["Who reviewed it?", "An authorized compliance reviewer retained it for specialist review; no legal conclusion is inferred."],
  ["What corrective action followed?", "Runtime isolation and authority rotation are in progress; effectiveness is unknown."],
  ["How can the complete sequence be replayed?", `The Enterprise Trust Timeline projects ${scenario.trustFabric.trustTimeline.length} canonical Epic 26 and 27 items, corrective action and the digest-bound draft package without duplicating sources.`],
] as const;return <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8"><div className="mx-auto max-w-6xl">
  <ExecutiveSummary eyebrow="Enterprise Trust Fabric Demo" title="Follow one trust decision through the Enterprise Trust Fabric™." bullets={["See identity and authority before execution.","Compare the declared and observed environment.","Follow evidence, contradiction and review without fabricated proof.","Replay what changed and what happened next."]} primary={{href:"/replay/demo",label:"Open Demonstration Replay"}} secondary={{href:"/enterprise-access?intent=demo",label:"Request Enterprise Demo"}} />
  <section className="mt-8 grid gap-4 md:grid-cols-2">{demonstrationContract.map(([question,answer])=><article key={question} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><h2 className="font-semibold text-white">{question}</h2><p className="mt-2 text-sm leading-7 text-zinc-300">{answer}</p></article>)}</section>
  <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Canonical demo route: /demo</p><h2 className="mt-3 text-2xl font-semibold text-white">One demonstration contract.</h2><div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{demoSequence.map((step,index)=><div key={step} className="border-t border-zinc-700 pt-4"><p className="text-xs font-semibold text-cyan-200">{index+1}</p><p className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{step}</p></div>)}</div></section>
  <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-zinc-800 bg-black p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Synthetic demonstration boundary</p><h2 className="mt-3 text-2xl font-semibold text-white">Attributed evidence, explicit uncertainty, no provider or legal overclaim.</h2></div><div className="flex flex-wrap gap-3"><Link href="/trust#trust-memory" className="brand-secondary-action">Trust Memory™</Link><Link href="/trust-centre/fabric" className="brand-primary-action">Trust Fabric</Link></div></section>
</div></main>;}
