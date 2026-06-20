"use client";

import Link from "next/link";
import { useState } from "react";

export type DemoScenarioStep = {
  title: string;
  state: string;
  explanation: string;
  evidence: string;
};

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
        <nav className="flex gap-4 text-sm text-zinc-400">
          <Link href="/demo">Demo overview</Link>
          <Link href="/dashboard">Pilot dashboard</Link>
        </nav>
        <header className="mt-10 border-b border-zinc-800 pb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">{label} / 90-second walkthrough</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">{summary}</p>
        </header>
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex justify-between text-sm"><b>Operational sequence</b><span>{active + 1} / {steps.length}</span></div>
            <div className="mt-4 h-1.5 rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-300" style={{ width: ((active + 1) / steps.length) * 100 + "%" }} /></div>
            <div className="mt-5 grid gap-2">
              {steps.map((item, index) => (
                <button key={item.title} type="button" onClick={() => setActive(index)} className={"rounded-md border px-3 py-2 text-left text-sm " + (index === active ? "border-cyan-700 bg-cyan-950/20 text-white" : "border-zinc-800 bg-black text-zinc-400")}>
                  <span className="mr-3 text-xs text-cyan-200">{index + 1}</span>{item.title}
                </button>
              ))}
            </div>
          </aside>
          <article className="rounded-lg border border-zinc-800 bg-black p-7">
            <div className="flex flex-wrap justify-between gap-4">
              <div><p className="text-xs uppercase text-zinc-500">Step {active + 1}</p><h2 className="mt-3 text-3xl font-semibold">{step.title}</h2></div>
              <span className="rounded-full border border-amber-800 px-3 py-1 text-xs text-amber-200">{step.state}</span>
            </div>
            <p className="mt-7 text-lg leading-8 text-zinc-300">{step.explanation}</p>
            <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs uppercase text-zinc-500">Evidence retained</p><p className="mt-3 text-sm leading-7 text-zinc-300">{step.evidence}</p></div>
            <p className="mt-5 text-sm text-zinc-500">Sample-only evidence. Signals inform human review; they do not decide candidate trust.</p>
            <div className="mt-8 flex justify-between gap-3">
              <button disabled={active === 0} onClick={() => setActive(active - 1)} className="rounded-md border border-zinc-700 px-4 py-2 text-sm disabled:opacity-30">Previous</button>
              {!complete ? <button onClick={() => setActive(active + 1)} className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-black">Continue</button> : nextScenario ? <Link href={nextScenario.href} className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-semibold text-black">{nextScenario.label}</Link> : <Link href="/demo-lab" className="rounded-md bg-cyan-300 px-5 py-2 text-sm font-semibold text-black">Seed pilot workflow</Link>}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
