"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const RATE_LIMIT_MESSAGE =
  "Email login is temporarily rate-limited. Please wait a few minutes before requesting another magic link.";

function isRateLimitError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("email rate limit exceeded") ||
    normalizedMessage.includes("too many requests")
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setLoading(true);

    let supabase;

    try {
      supabase = createClient();
    } catch {
      setMessage("Supabase env vars are missing.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/command-center`,
      },
    });

    setLoading(false);

    if (error) {
      setMessage(isRateLimitError(error.message) ? RATE_LIMIT_MESSAGE : error.message);
      return;
    }

    setMessage("Magic link sent. Check your email.");
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-bold">Sentinel Login</h1>

        <p className="mt-4 text-zinc-400">
          Access the Cyber Sentinels Command Center.
        </p>

        <div className="mt-8 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email address"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <p className="text-sm text-zinc-400">
            Only click once. Supabase may rate-limit repeated login emails.
          </p>

          <button
            onClick={signIn}
            disabled={loading}
            className="rounded-xl bg-white p-4 font-semibold text-black disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>

          {message && <p className="text-sm text-zinc-400">{message}</p>}

          <Link href="/" className="text-sm text-zinc-400 underline">
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
