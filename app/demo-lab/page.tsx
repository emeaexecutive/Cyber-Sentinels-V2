"use client";

import { useState } from "react";
import Link from "next/link";

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
    <main className="min-h-screen bg-black p-8 text-white">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm uppercase tracking-[0.24em] text-yellow-300">
          Controlled demonstration environment.
        </p>
        <h1 className="mt-4 text-4xl font-bold">Demo Lab</h1>
        <p className="mt-4 text-zinc-400">
          Run a two-minute Hiring Security walkthrough from partial identity
          verification to a human-reviewed session block.
        </p>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ["00:00", "Synthetic candidate", "Open a clearly labelled sample candidate with partial verification."],
            ["00:30", "Injection risk", "Show the retained channel flag and explain why the workflow pauses."],
            ["01:00", "Governance escalation", "Follow the evidence into accountable human review."],
            ["01:20", "Manual review", "Inspect the chronology and reviewer action without an automated candidate verdict."],
            ["01:40", "Risky session blocked", "Show the suspicious session outcome and preserved audit reference."],
            ["02:00", "Replay and receipt", "Open the replay chronology and printable enterprise receipt."],
          ].map(([time, title, copy]) => (
            <article key={time} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-semibold text-cyan-300">{time}</p>
              <h2 className="mt-2 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
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
        </div>
      </section>
    </main>
  );
}
