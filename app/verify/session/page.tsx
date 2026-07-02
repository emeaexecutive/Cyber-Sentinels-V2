"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SessionSignalCards } from "@/components/session-integrity";
import type { ExplainableSessionSignal } from "@/lib/session-integrity/model";

type ReviewResult = {
  ok?: boolean;
  error?: string;
  check_id?: string;
  session_id?: string;
  overall_status?: string;
  summary?: string;
  signals?: ExplainableSessionSignal[];
};

export default function VerifySessionPage() {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    const form = new FormData(event.currentTarget);
    const numberOrUndefined = (name: string) => {
      const value = String(form.get(name) ?? "").trim();
      return value === "" ? undefined : Number(value);
    };

    try {
      const response = await fetch("/api/session/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: form.get("session_id"),
          identity_verification_state: form.get("identity_verification_state"),
          liveness_state: form.get("liveness_state"),
          deepfake_risk_score: numberOrUndefined("deepfake_risk_score"),
          injection_risk_score: numberOrUndefined("injection_risk_score"),
          channel_integrity_state: form.get("channel_integrity_state"),
          session_anomaly_score: numberOrUndefined("session_anomaly_score"),
          manual_review_required: form.get("manual_review_required") === "on",
          evidence_source: "session_integrity_review_form",
        }),
      });
      const body = (await response.json().catch(() => ({
        error: "Session Integrity response could not be read.",
      }))) as ReviewResult;
      setResult(response.ok ? body : {
        ...body,
        ok: false,
        error: body.error ?? `Session Integrity request failed with HTTP ${response.status}.`,
      });
    } catch {
      setResult({
        ok: false,
        error: "Session Integrity is temporarily unavailable. Retry without changing the workflow outcome.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link href="/demo/hiring-attack" className="text-zinc-300 hover:text-white">Hiring scenario</Link>
          <Link href="/replay/demo" className="text-cyan-200 hover:text-white">Continue to Replay Timeline</Link>
        </nav>
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Session Integrity Review
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Review session and channel integrity signals
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Record liveness, deepfake risk, injection risk, channel integrity and session anomalies separately. Identity verification is no longer enough, and every flag remains subject to human review.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Detection is one signal. Cyber Sentinels does not claim perfect real/fake detection. Final workflow trust state depends on provider evidence, governance review and replay.
          </p>
        </section>
        <div className="mt-6 flex justify-end">
          <Link href="/replay/demo" className="brand-primary-action">
            Continue to Replay Timeline
          </Link>
        </div>

        <nav className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link href="/verify/candidate" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">Candidate Verification</Link>
          <Link href="/dashboard/governance" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">Governance Review</Link>
          <Link href="/trust-replay" className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white">Replay Timeline</Link>
        </nav>

        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Liveness", "Whether a live presence challenge was completed; it does not establish identity by itself."],
            ["Injection risk", "Whether the capture channel shows signs of a substituted or injected source."],
            ["Deepfake risk", "Media-risk indicators that require evidence-aware review, never an automatic authenticity verdict."],
            ["Device / channel integrity", "Continuity of the device, browser, capture path and session metadata."],
            ["Manual review", "A named reviewer evaluates conflicting or incomplete evidence and records the operational outcome."],
          ].map(([title, description]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
              <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
            </article>
          ))}
        </section>

        <form
          onSubmit={submitReview}
          className="mt-8 grid gap-5 rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:grid-cols-2"
        >
          <label className="grid gap-2 text-sm text-zinc-300 md:col-span-2">
            Interview session ID
            <input name="session_id" required className="rounded-lg border border-zinc-700 bg-black p-3 text-white" />
          </label>
          {[
            ["identity_verification_state", "Identity verification state", ["pending", "verified", "needs_review"]],
            ["liveness_state", "Liveness state", ["pending", "confirmed", "failed"]],
            ["channel_integrity_state", "Channel integrity state", ["pending", "verified", "failed"]],
          ].map(([name, label, options]) => (
            <label key={String(name)} className="grid gap-2 text-sm text-zinc-300">
              {String(label)}
              <select name={String(name)} className="rounded-lg border border-zinc-700 bg-black p-3 text-white">
                {(options as string[]).map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          ))}
          {[
            ["deepfake_risk_score", "Deepfake risk score"],
            ["injection_risk_score", "Injection risk score"],
            ["session_anomaly_score", "Session anomaly score"],
          ].map(([name, label]) => (
            <label key={name} className="grid gap-2 text-sm text-zinc-300">
              {label} (0-100, optional)
              <input name={name} type="number" min="0" max="100" className="rounded-lg border border-zinc-700 bg-black p-3 text-white" />
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm text-zinc-300 md:col-span-2">
            <input type="checkbox" name="manual_review_required" className="h-4 w-4" />
            Require manual review based on other evidence
          </label>
          <button disabled={loading} className="rounded-lg bg-white px-4 py-3 font-semibold text-black disabled:opacity-50 md:col-span-2">
            {loading ? "Recording review..." : "Record session integrity review"}
          </button>
        </form>

        {result ? (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">
              {result.ok ? "Explainable review signals" : "Review could not be recorded"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {result.summary ?? result.error ?? "Unknown response"}
            </p>
            {result.signals?.length ? <div className="mt-6"><SessionSignalCards signals={result.signals} /></div> : null}
            {result.ok && result.session_id ? (
              <Link href={`/trust/session/${result.session_id}`} className="mt-5 inline-flex text-sm text-cyan-200 underline">
                Open session trust review
              </Link>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

