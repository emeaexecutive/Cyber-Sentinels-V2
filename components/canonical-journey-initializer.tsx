"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CanonicalJourneyInitializer() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function initialize() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/operational-entities/canonical-journey", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Initialization failed.");
      router.refresh();
    } catch {
      setMessage("The canonical Alpha/Beta/Gamma journey could not be initialized. Retry shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        disabled={pending}
        onClick={initialize}
        className="rounded-lg bg-cyan-800 px-5 py-3 font-semibold text-white hover:bg-cyan-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Initializing canonical journey…" : "Continue with canonical Alpha, Beta and Gamma"}
      </button>
      {message ? <p role="alert" className="mt-3 text-sm text-rose-800">{message}</p> : null}
    </div>
  );
}
