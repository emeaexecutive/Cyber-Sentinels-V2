"use client";

import { useState } from "react";

type SeedState = "idle" | "loading" | "success" | "error";

export default function DemoLabPage() {
  const [state, setState] = useState<SeedState>("idle");
  const [message, setMessage] = useState("");

  async function seedDemoData() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/demo/seed", { method: "POST" });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setState("error");
        setMessage(payload.error || "Demo data could not be seeded.");
        return;
      }

      setState("success");
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
      <section className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-yellow-300">
          Private beta / development only.
        </p>
        <h1 className="mt-4 text-4xl font-bold">Demo Lab</h1>
        <p className="mt-4 text-zinc-400">
          Seed a coherent pilot story with sample evidence, governance review,
          replay context and verification receipts.
        </p>

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
        </div>
      </section>
    </main>
  );
}
