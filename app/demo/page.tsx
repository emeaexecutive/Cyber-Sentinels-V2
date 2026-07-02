import Link from "next/link";

const risks = [
  ["Synthetic applicants", "Generated profiles and incomplete verification evidence can enter hiring workflows that were built for a more verifiable world."],
  ["Proxy interviews", "The person in the session may not match the person being evaluated or granted access."],
  ["Injected video feeds", "Identity can be verified at entry while the interview channel changes later."],
  ["Governance gaps", "Flags without ownership, evidence or human review become operational risk."],
];

const proofLinks = [
  ["/demo/hiring-attack", "Hiring Security", "Understand the fake-candidate workflow in one sequence."],
  ["/demo/session-integrity", "Session Integrity Demo", "See how trust changes after verification begins."],
  ["/replay/demo", "Replay Evidence", "Inspect the controlled demonstration chronology."],
  ["/verification/receipt/demo", "Verification Receipt", "Review the matching demonstration receipt."],
];

const demoSequence = [
  "Fake candidate enters workflow",
  "Interview session begins",
  "Provider verification is checked",
  "Session anomaly is detected",
  "Governance escalation is triggered",
  "Replay reconstructs the chronology",
  "Verification receipt is generated",
  "Trust posture is updated",
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-zinc-800 pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Workflow trust demo</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
            A guided walkthrough from controlled identity conflict to governed workflow outcome.
          </h1>
          <p className="mt-6 max-w-3xl leading-8 text-zinc-200">
            In under 90 seconds, see what entered the workflow, what changed during the session, what evidence was reviewed and which governance action determined the outcome.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Follow one path through provider verification, session integrity, governance, replay, receipt and evolving trust posture.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo/hiring-attack" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-200">View Demo</Link>
            <Link href="/enterprise-access" className="rounded-md border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">Request Enterprise Access</Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">Become a Design Partner</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Link href="/demo/hiring-attack" className="rounded-lg border border-cyan-800 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Hiring Security</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Follow a simulated candidate from intake through a Session Integrity anomaly, governance escalation, replay evidence, Verification Receipt and workflow outcome.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-200">Start walkthrough</p>
          </Link>
          <Link href="/demo/session-integrity" className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Session Integrity</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">See why verification alone is insufficient when channel evidence, authorization context and session risk change after entry.</p>
            <p className="mt-5 text-sm font-semibold text-cyan-200">Start walkthrough</p>
          </Link>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {risks.map(([title, copy]) => (
            <article key={title} className="border-t border-zinc-700 pt-4">
              <h2 className="font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold text-white">Traditional cybersecurity tools protect</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Networks, devices and communications.</p>
          </article>
          <article className="rounded-lg border border-cyan-900 bg-black p-5">
            <h2 className="text-xl font-semibold text-white">Cyber Sentinels protects</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">Operational trust, workflow integrity, session authenticity, identity accountability and verification evidence.</p>
          </article>
        </section>

        <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Demo sequence</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">The full enterprise review sequence.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
            {demoSequence.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-zinc-800 bg-black p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Replayable proof</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Make the proof visible after the walkthrough.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">Use these surfaces to show the primary workflow trust narrative: demo, Replay Evidence, Verification Receipt, Governance Review and final workflow outcome.</p>
            </div>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-400">Book Intro Call</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {proofLinks.map(([href, title, copy]) => (
              <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 hover:border-cyan-700">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">{copy}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
