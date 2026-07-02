"use client";

import { useState } from "react";
import Link from "next/link";
import { simulationScenarios } from "@/lib/simulationScenarios";

type SeedState = "idle" | "loading" | "success" | "error";

export default function DemoLabPage() {
  const [state, setState] = useState<SeedState>("idle");
  const [message, setMessage] = useState("");
  const [demoLinks, setDemoLinks] = useState<{
    sessionId?: string;
    replayId?: string;
    receiptId?: string;
  }>({});

  async function seedDemoData() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        records?: {
          guided_demo_interview_session?: string | null;
          guided_demo_replay?: string | null;
          guided_demo_receipt?: string | null;
        };
      };

      if (!response.ok || !payload.ok) {
        setState("error");
        setMessage(payload.error || "Demo data could not be seeded.");
        return;
      }

      setState("success");
      setDemoLinks({
        sessionId: payload.records?.guided_demo_interview_session ?? undefined,
        replayId: payload.records?.guided_demo_replay ?? undefined,
        receiptId: payload.records?.guided_demo_receipt ?? undefined,
      });
      setMessage(
        payload.message ||
          "Demo workspace seeded. Open the workspace to review the operational progression."
      );
    } catch {
      setState("error");
      setMessage("Demo data could not be seeded.");
    }
  }

  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white sm:px-6 md:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Controlled simulation environment
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Operational Trust Simulation Suite</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust changes. Cyber Sentinels shows why. Each scenario connects
            evidence, governance, replay and outcome without presenting benchmark results.
          </p>
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Scenario library</p>
              <h2 className="mt-2 text-2xl font-semibold">Seven operational trust workflows</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {simulationScenarios.map((scenario) => (
              <article key={scenario.id} className="rounded-lg border border-zinc-800 bg-black p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">{scenario.riskType}</p>
                    <h3 className="mt-2 text-lg font-semibold text-zinc-100">{scenario.name}</h3>
                  </div>
                  <span className="rounded-full border border-cyan-900 bg-cyan-950/30 px-2.5 py-1 text-xs text-cyan-100">
                    {scenario.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{scenario.summary}</p>
                <div className="mt-4 grid gap-2 text-xs text-zinc-300">
                  <p>Trust Posture: {scenario.initialPosture} → {scenario.finalPosture}</p>
                  <p>Provider: {scenario.providerState}</p>
                  <p>{scenario.manualReviewIndicator}</p>
                </div>
                <Link
                  href={`/replay/demo?scenario=${scenario.id}`}
                  className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-white"
                >
                  Open Replay Timeline
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">Guided hiring walkthrough</p>
          <h2 className="mt-2 text-2xl font-semibold">Two-minute operational sequence</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["1", "Workflow enters", "A person, agent or workflow enters a trusted process."],
            ["2", "Checks run", "Identity, Session Integrity and available evidence are checked."],
            ["3", "Trust changes", "Trust Posture records what changed over time."],
            ["4", "Governance acts", "A named reviewer intervenes when risk appears."],
            ["5", "Replay explains", "Chronology connects the event, evidence and action."],
            ["6", "Outcome preserved", "A receipt or report preserves the reviewed state."],
          ].map(([time, title, copy]) => (
            <article key={time} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold text-cyan-300">{time}</p>
              <h2 className="mt-2 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm font-semibold text-yellow-300">
            Sample operational progression only.
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            The seeded workspace should make the demo understandable within
            minutes: case intake, evidence upload, unresolved signal,
            governance review, replay and receipt availability.
          </p>

          <button
            onClick={seedDemoData}
            disabled={state === "loading"}
            type="button"
            className="mt-5 rounded-lg bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {state === "loading" ? "Seeding..." : "Seed Demo Data"}
          </button>

          {message ? (
            <p
              className={
                state === "success"
                  ? "mt-4 text-sm text-emerald-300"
                  : "mt-4 text-sm text-zinc-400"
              }
            >
              {message}
            </p>
          ) : null}

          {state === "success" && demoLinks.sessionId ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/replay/${demoLinks.replayId ?? demoLinks.sessionId}`} className="rounded-lg border border-cyan-800 px-4 py-2 text-sm text-cyan-100">
                Open Replay
              </Link>
              {demoLinks.receiptId ? (
                <Link href={`/verification/receipt/${demoLinks.receiptId}`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
                  Open Verification Receipt
                </Link>
              ) : null}
              <Link href={`/trust/hiring-report/${demoLinks.sessionId}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
                Open Hiring Review
              </Link>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
