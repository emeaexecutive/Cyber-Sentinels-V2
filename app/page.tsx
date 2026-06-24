import Link from "next/link";
import { PrivateBetaBadge, PrivateBetaNotice } from "@/components/private-beta";

const priorities = [
  ["What happened", "A verified-looking applicant entered a remote hiring workflow and reached a live interview."],
  ["What was detected", "Session evidence changed: channel, media and injection-risk signals no longer matched the verified context."],
  ["What action occurred", "The workflow paused, a governance review opened and the risky session was blocked by human authority."],
  ["What evidence was created", "Replay chronology, reviewer action, audit references and a verification receipt were retained."],
];

const workflow = [
  "Fake candidate enters workflow",
  "Verification begins",
  "Session integrity fails",
  "Governance review opens",
  "Replay evidence is generated",
  "Threat is blocked",
  "Verification receipt is issued",
];

const operatingExamples = [
  ["Hiring fraud", "Synthetic profile reaches interview; incomplete provenance and session changes are reviewed before access advances."],
  ["Injected interview", "Candidate identity is checked at entry, then channel evidence changes during the call and triggers escalation."],
  ["Governance review", "A named reviewer receives evidence, records the decision and leaves a receipt that security, talent and compliance can read."],
];

const traditionalSecurity = [
  "devices",
  "endpoints",
  "credentials",
  "communications",
];

const cyberSentinelsProtects = [
  "identity trust",
  "workflow integrity",
  "session authenticity",
  "governance accountability",
  "replayable audit evidence",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <PrivateBetaBadge />
          <span className="rounded-full border border-cyan-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Enterprise pilot ready</span>
        </div>

        <div className="mt-12 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Operational Trust Infrastructure for AI-era workflows.</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] text-white md:text-6xl">
            Protect enterprise workflows against synthetic identity attacks.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels helps enterprise teams review hiring fraud, injected interview sessions and identity-risk workflows before they become operational decisions.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">
            Existing cybersecurity tools detect threats. Cyber Sentinels verifies operational trust: what happened, what changed, who reviewed it and what evidence was created.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-access" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">Request Enterprise Access</Link>
          <Link href="/demo" className="rounded-md border border-zinc-500 px-5 py-3 text-sm font-semibold text-white hover:border-zinc-200">View Demo</Link>
          <Link href="/demo/hiring-attack" className="rounded-md border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">Hiring Security Demo</Link>
          <Link href="/demo/session-integrity" className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">Session Integrity Demo</Link>
        </div>
        <PrivateBetaNotice className="mt-7 max-w-3xl" />
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-[0.85fr_1.15fr] md:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Operational story</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-white">A hiring session changes after verification.</h2>
            <p className="mt-4 leading-7 text-zinc-200">
              A candidate can look verified at the start of a workflow while the interview channel changes later.
            </p>
            <p className="mt-4 leading-7 text-zinc-300">
              Cyber Sentinels makes that change reviewable: signal, escalation, reviewer action, replay evidence and receipt in one operational sequence.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {priorities.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Enterprise positioning</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">Cyber Sentinels operates above the stack you already trust.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Traditional security protects devices, credentials and messages. Cyber Sentinels protects identity trust, workflow integrity, session authenticity and operational accountability after those controls are in place.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h3 className="text-lg font-semibold text-white">Traditional security protects</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">
              {traditionalSecurity.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </article>
          <article className="rounded-lg border border-cyan-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-white">Cyber Sentinels protects</h3>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-200">
              {cyberSentinelsProtects.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Operational examples</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white">The product story is the review workflow.</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {operatingExamples.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Hiring Security entry point</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">A clear path from fake candidate to replayable proof.</h2>
            </div>
            <Link href="/enterprise/pilot" className="rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-300">Pilot Structure</Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-7">
            {workflow.map((step, index) => (
              <div key={step} className="border-t border-zinc-700 pt-4">
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
