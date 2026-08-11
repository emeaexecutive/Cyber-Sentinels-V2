"use client";

import { useState } from "react";
import { TurnstileField } from "@/components/turnstile-field";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken })
    });
    setStatus(res.ok ? "success" : "error");
    if (res.ok) {
      setEmail("");
      setTurnstileToken("");
    } else {
      setTurnstileResetKey((value) => value + 1);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-sentinel-line bg-white/[0.04] p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Enter your email for early access"
          className="min-h-12 flex-1 rounded-2xl border border-sentinel-line bg-black/40 px-4 text-sm outline-none placeholder:text-sentinel-muted"
        />
        <button disabled={status === "loading" || !turnstileToken} className="min-h-12 rounded-2xl bg-sentinel-white px-6 text-sm font-semibold text-black hover:bg-sentinel-green disabled:cursor-not-allowed disabled:opacity-50">
          {status === "loading" ? "Joining..." : "Join waitlist"}
        </button>
      </div>
      <div className="mt-3">
        <TurnstileField
          siteKey={turnstileSiteKey}
          onTokenChange={setTurnstileToken}
          resetKey={turnstileResetKey}
        />
      </div>
      {status === "success" && <p className="mt-3 px-2 text-sm text-sentinel-green">You are on the Cyber Sentinels V2 waitlist.</p>}
      {status === "error" && <p className="mt-3 px-2 text-sm text-red-300">Security check failed. Please try again.</p>}
    </form>
  );
}
