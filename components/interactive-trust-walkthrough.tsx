"use client";

import { useEffect, useState } from "react";

const walkthroughSteps = [
  { label: "Establish Trust", status: "Test Mode" },
  { label: "Resolve Identity", status: "Awaiting Credentials" },
  { label: "Confirm Authority", status: "Test Mode" },
  { label: "Collect Evidence", status: "Simulated" },
  { label: "Evaluate Trust", status: "Test Mode" },
  { label: "Enforce Decision", status: "Test Mode" },
  { label: "Write Replay", status: "Simulated" },
  { label: "Update Trust Memory™", status: "Simulated" },
  { label: "Produce Evidence Pack", status: "Simulated" },
] as const;

const stepCadenceMs = 1800;
// Previous seven-step cadence was 2400 ms; nine RC1 steps remain within the same 15-20 second target.

const statusLegend = [
  ["Live", "Only after a real health check"],
  ["Test Mode", "Approved provider or deterministic test"],
  ["Simulated", "No external provider call"],
  ["Awaiting Credentials", "Provider call unavailable"],
  ["Unavailable", "Safe degraded state"],
] as const;

export function InteractiveTrustWalkthrough() {
  const [activeStep, setActiveStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setActiveStep((current) => {
        if (current >= walkthroughSteps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, stepCadenceMs);
    return () => window.clearTimeout(timer);
  }, [activeStep, playing]);

  function startWalkthrough() {
    setActiveStep(0);
    setPlaying(true);
  }

  return (
    <div className="story-frame" data-testid="interactive-trust-walkthrough">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="operational-eyebrow">15–20 seconds / approved demo</p>
          <h2 className="mt-2 text-xl font-semibold text-white">See one Trust Assessment move from Identity to an Enterprise Outcome.</h2>
        </div>
        <button type="button" onClick={startWalkthrough} aria-controls="interactive-trust-walkthrough-steps" className="brand-secondary-action">
          {playing ? "Restart Trust Flow" : "See Trust in Action"}
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-zinc-400" aria-label="Provider status legend">
        {statusLegend.map(([status, meaning]) => <span key={status} className="rounded-full border border-zinc-800 px-3 py-1">{status}: {meaning}</span>)}
      </div>
      <ol id="interactive-trust-walkthrough-steps" aria-label="Interactive Operational Trust walkthrough" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-9">
        {walkthroughSteps.map((step, index) => {
          const complete = activeStep > index;
          const active = activeStep === index;
          return (
            <li key={step.label} aria-current={active ? "step" : undefined} className={`rounded-lg border p-3 transition-all duration-500 ${
              active ? "border-cyan-400 bg-cyan-950/40 text-white shadow-lg shadow-cyan-950/40"
                : complete ? "border-cyan-900 bg-cyan-950/10 text-cyan-100" : "border-zinc-800 bg-black/60 text-zinc-500"
            }`}>
              <span className="font-mono text-[10px] text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
              <strong className="mt-2 block text-sm">{step.label}</strong>
              <span className="mt-2 block text-[10px] uppercase tracking-[0.12em] text-zinc-400">{step.status}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {activeStep >= 0 ? `Current step: ${walkthroughSteps[activeStep].label}; ${walkthroughSteps[activeStep].status}` : "Walkthrough ready"}
      </p>
    </div>
  );
}
