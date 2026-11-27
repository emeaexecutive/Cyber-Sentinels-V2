"use client";

import Link from "next/link";
import { useState } from "react";
import { TurnstileField } from "@/components/turnstile-field";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resendVerificationEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Enter the email address you used to create your account.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/submit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation: "resend", email: trimmedEmail, turnstileToken: token }),
      });
      const { error } = await response.json();

      if (!response.ok || error) {
        setMessage("Could not resend the verification email. Please wait a moment and try again.");
        return;
      }

      setMessage("Verification email resent. Check your inbox and spam or junk folder.");
    } catch {
      setMessage("Could not resend the verification email. Please try again shortly.");
    } finally {
      setLoading(false);
      setToken("");
      setResetKey(value => value + 1);
    }
  }

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Email Verification</p>
        <h1 className="mt-4 text-4xl font-semibold">Please verify your email before continuing.</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Check your inbox for the Cyber Sentinels verification email. Once your email address is verified, return to the protected workflow and continue.
        </p>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Email not received?</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
            <li>Check spam or junk mail.</li>
            <li>Confirm the email address was typed correctly.</li>
            <li>Wait a few minutes for delivery.</li>
            <li>Resend the verification email when needed.</li>
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="sr-only" htmlFor="verification-email">Account email address</label>
            <input
              id="verification-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white"
            />
            <button
              onClick={resendVerificationEmail}
              disabled={loading || !token}
              type="button"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend verification"}
            </button>
          </div>
          <TurnstileField action="signup" siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
            onTokenChange={setToken} onErrorChange={error => { if (error) setMessage(error); }} resetKey={resetKey} />
          {message ? <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-300">{message}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
            Back to login
          </Link>
          <Link href="/help" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
            Help Centre
          </Link>
        </div>
      </section>
    </main>
  );
}
