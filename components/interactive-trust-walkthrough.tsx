"use client";

import { useEffect, useState } from "react";

const walkthroughSteps = [
  "Identity",
  "Authority",
  "Evidence",
  "Decision",
  "Replay",
  "Trust Memory™",
  "Enterprise Outcome",
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
    }, 2400);
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
          <p className="operational-eyebrow">15–20 seconds</p>
          <h2 className="mt-2 text-xl font-semibold text-white">See one trust decision move from identity to an enterprise outcome.</h2>
        </div>
        <button
          type="button"
          onClick={startWalkthrough}
          aria-controls="interactive-trust-walkthrough-steps"
          className="brand-secondary-action"
        >
          {playing ? "Restart Trust Flow" : "See Trust in Action"}
        </button>
      </div>
      <ol id="interactive-trust-walkthrough-steps" aria-label="Interactive Operational Trust walkthrough" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {walkthroughSteps.map((step, index) => {
          const complete = activeStep > index;
          const active = activeStep === index;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className={`rounded-lg border p-3 transition-all duration-500 ${
                active
                  ? "border-cyan-400 bg-cyan-950/40 text-white shadow-lg shadow-cyan-950/40"
                  : complete
                    ? "border-cyan-900 bg-cyan-950/10 text-cyan-100"
                    : "border-zinc-800 bg-black/60 text-zinc-500"
              }`}
            >
              <span className="font-mono text-[10px] text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
              <strong className="mt-2 block text-sm">{step}</strong>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {activeStep >= 0 ? `Current step: ${walkthroughSteps[activeStep]}` : "Walkthrough ready"}
      </p>
    </div>
  );
}
