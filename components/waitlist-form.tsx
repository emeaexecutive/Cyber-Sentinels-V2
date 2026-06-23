"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    onCyberSentinelsWaitlistTurnstile?: (token: string) => void;
  }
}

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    window.onCyberSentinelsWaitlistTurnstile = (token: string) => setTurnstileToken(token);
    return () => {
      delete window.onCyberSentinelsWaitlistTurnstile;
    };
  }, []);

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
        <button disabled={status === "loading"} className="min-h-12 rounded-2xl bg-sentinel-white px-6 text-sm font-semibold text-black hover:bg-sentinel-green">
          {status === "loading" ? "Joining..." : "Join waitlist"}
        </button>
      </div>
      {turnstileSiteKey ? (
        <div className="mt-3">
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onCyberSentinelsWaitlistTurnstile" />
        </div>
      ) : null}
      {status === "success" && <p className="mt-3 px-2 text-sm text-sentinel-green">You are on the Cyber Sentinels V2 waitlist.</p>}
      {status === "error" && <p className="mt-3 px-2 text-sm text-red-300">Security check failed. Please try again.</p>}
    </form>
  );
}