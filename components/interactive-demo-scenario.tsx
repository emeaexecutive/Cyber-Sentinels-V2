"use client";

import Link from "next/link";
import { useState } from "react";

export type DemoScenarioStep = {
  title: string;
  state: string;
  explanation: string;
  evidence: string;
  action: string;
};

const proofPath = [
  "Candidate enters workflow",
  "Verification record opens",
  "Session anomaly recorded",
  "Governance review assigned",
  "Replay chronology available",
  "Reviewer action recorded",
  "Verification receipt issued",
];

export function InteractiveDemoScenario({ label, title, summary, steps, nextScenario }: {
  label: string;
  title: string;
  summary: string;
  steps: DemoScenarioStep[];
  nextScenario?: { href: string; label: string };
}) {
  const [active, setActive] = useState(0);
  const step = steps[active];
  const complete = active === steps.length - 1;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <nav className="flex gap-4 text-sm text-zinc-300">
          <Link href="/demo">Demo overview</Link>
          <Link href="/enterprise-access">Request Enterprise Access</Link>
          <Link href="/enterprise-access?intent=intro_call">Book Intro Call</Link>
        </nav>
        <header className="mt-10 border-b border-zinc-800 pb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{label} / 90-second walkthrough</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-200">{summary}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["Operational event", "State transition", "Evidence retained"].map((item) => (
              <div key={item} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">{item}</p>
                <p className="mt-2 text-sm text-zinc-200">Step {active + 1}: {step.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-2 md:grid-cols-7">
            {proofPath.map((item, index) => (
              <div
                key={item}
                className={
                  "rounded-lg border p-3 " +
                  (index === active ? "border-cyan-700 bg-cyan-950/20" : index < active ? "border-emerald-900 bg-emerald-950/10" : "border-zinc-800 bg-black")
                }
              >
                <p className="text-xs font-semibold text-cyan-200">{index + 1}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-200">{item}</p>
              </div>
            ))}
          </div>
        </header>
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex justify-between text-sm"><b>Operational sequence</b><span>{active + 1} / {steps.length}</span></div>
            <div className="mt-4 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: ((active + 1) / steps.length) * 100 + "%" }} /></div>
            <div className="mt-5 grid gap-2">
              {steps.map((item, index) => (
                <button key={item.title} type="button" onClick={() => setActive(index)} className={"rounded-md border px-3 py-2 text-left text-sm " + (index === active ? "border-cyan-700 bg-cyan-950/20 text-white" : "border-zinc-800 bg-black text-zinc-300")}>
                  <span className="mr-3 text-xs text-cyan-200">{index + 1}</span>{item.title}
                </button>
              ))}
            </div>
          </aside>
          <article className="rounded-lg border border-zinc-800 bg-black p-7">
            <div className="flex flex-wrap justify-between gap-4">
              <div><p className="text-xs uppercase text-zinc-400">Step {active + 1}</p><h2 className="mt-3 text-3xl font-semibold">{step.title}</h2></div>
              <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">{step.state}</span>
            </div>
            <p className="mt-7 text-lg leading-8 text-zinc-300">{step.explanation}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs uppercase text-zinc-400">Evidence retained</p><p className="mt-3 text-sm leading-7 text-zinc-200">{step.evidence}</p></div>
              <div className="rounded-lg border border-cyan-950 bg-zinc-950 p-5"><p className="text-xs uppercase text-zinc-400">Operational action</p><p className="mt-3 text-sm leading-7 text-zinc-200">{step.action}</p></div>
            </div>
            <p className="mt-5 text-sm text-zinc-300">Sample-only evidence. Flags support human review; they do not make hiring decisions or replace reviewer accountability.</p>
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <button disabled={active === 0} onClick={() => setActive(active - 1)} className="rounded-md border border-zinc-700 px-4 py-2 text-sm disabled:opacity-30">Previous</button>
              {!complete ? <button onClick={() => setActive(active + 1)} className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-black">Continue</button> : nextScenario ? <Link href={nextScenario.href} className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-semibold text-black">{nextScenario.label}</Link> : <Link href="/demo" className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-semibold text-black">View Demo</Link>}
            </div>
            {complete ? (
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Link href="/demo" className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400">View Demo</Link>
                <Link href="/enterprise-access" className="rounded-md border border-cyan-800 px-4 py-2 text-cyan-100 hover:border-cyan-400">Request Enterprise Access</Link>
                <Link href="/enterprise-access?intent=design_partner" className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400">Become a Design Partner</Link>
                <Link href="/enterprise-access?intent=intro_call" className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-200 hover:border-zinc-400">Book Intro Call</Link>
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
