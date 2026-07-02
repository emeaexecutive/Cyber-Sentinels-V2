import Link from "next/link";

const demoSequence = [
  "Person, agent or workflow enters",
  "Identity, session and evidence checked",
  "Trust changes over time",
  "Governance intervenes",
  "Replay explains why",
  "Receipt preserves the outcome",
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-zinc-800 pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Workflow trust demo</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight md:text-6xl">
            Trust changes. Cyber Sentinels shows why.
          </h1>
          <p className="mt-6 max-w-3xl leading-8 text-zinc-200">
            In under 90 seconds, follow one trusted workflow from entry to evidence, governance, replay and receipt.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Replayable evidence for trusted workflows.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/demo/hiring-attack" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-200">View Demo</Link>
            <Link href="/enterprise-access" className="rounded-md border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">Request Enterprise Access</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <Link href="/demo/hiring-attack" className="rounded-lg border border-cyan-800 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Hiring Security</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Follow a simulated candidate from intake through a Session Integrity anomaly, governance escalation, replay evidence, Verification Receipt and workflow outcome.</p>
          </Link>
          <Link href="/demo/session-integrity" className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 hover:border-cyan-400">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">90-second walkthrough</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Session Integrity</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">See why verification alone is insufficient when channel evidence, authorization context and session risk change after entry.</p>
          </Link>
        </section>

        <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Demo sequence</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">One operational story.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            {demoSequence.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-zinc-800 bg-black p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Replayable proof</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Event. Evidence. Trust change. Governance. Outcome.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trust" className="brand-secondary-action">Trust Center</Link>
            <Link href="/enterprise/hiring-security" className="brand-primary-action">Hiring Security</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
