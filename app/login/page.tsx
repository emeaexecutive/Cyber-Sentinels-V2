"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RATE_LIMIT_MESSAGE =
  "Email login is temporarily rate-limited. Use password login or wait before requesting another magic link.";

function isRateLimitError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("email rate limit exceeded") ||
    normalizedMessage.includes("too many requests")
  );
}

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/command-center";
  }

  return path;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/command-center");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);

  useEffect(() => {
    setShowDevAuth(
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" &&
        window.location.hostname === "localhost",
    );

    const searchParams = new URLSearchParams(window.location.search);

    setNextPath(getSafeRedirect(searchParams.get("next")));

    if (searchParams.get("expired") === "1") {
      window.localStorage.removeItem("cyber_sentinels_session_started_at");
      setMessage("Session expired for security. Please sign in again.");
    }
  }, []);

  function getSupabaseClient() {
    try {
      return createClient();
    } catch {
      setMessage("Supabase env vars are missing.");
      return null;
    }
  }

  async function signInWithPassword() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      return;
    }

    setMessage("");
    setLoadingAction("password");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setLoadingAction(null);

    if (error) {
      setMessage(error.message || "Could not sign in with password.");
      return;
    }

    router.push(nextPath);
  }

  async function signInWithMagicLink() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setMessage("");
    setLoadingAction("magic-link");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextPath || "/command-center"
        )}`,
      },
    });

    setLoadingAction(null);

    if (error) {
      setMessage(isRateLimitError(error.message) ? RATE_LIMIT_MESSAGE : error.message);
      return;
    }

    setMessage("Magic link sent. Check your email.");
  }

  async function sendPasswordResetEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setMessage("");
    setLoadingAction("reset");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoadingAction(null);

    if (error) {
      setMessage(error.message || "Could not send password reset email.");
      return;
    }

    setMessage("Password reset email sent. Check your email.");
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-bold">Sentinel Login</h1>

        <p className="mt-4 text-zinc-400">
          Access the Cyber Sentinels Command Center.
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Enter your email and Supabase will send a magic link. Open that email
          link to finish signing in.
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Login first, then you will return to Admin Access.
        </p>

        <div className="mt-8 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
          />

          <p className="text-sm text-zinc-400">
            Only click once. Supabase may rate-limit repeated login emails.
          </p>

          <button
            onClick={signInWithPassword}
            disabled={loadingAction !== null}
            className="rounded-xl bg-white p-4 font-semibold text-black disabled:opacity-50"
            type="button"
          >
            {loadingAction === "password" ? "Signing in..." : "Sign in with password"}
          </button>

          <button
            onClick={signInWithMagicLink}
            disabled={loadingAction !== null}
            className="rounded-xl border border-zinc-700 p-4 font-semibold text-white disabled:opacity-50"
            type="button"
          >
            {loadingAction === "magic-link" ? "Sending..." : "Send Magic Link"}
          </button>

          <button
            onClick={sendPasswordResetEmail}
            disabled={loadingAction !== null}
            className="rounded-xl border border-zinc-800 p-4 font-semibold text-zinc-200 disabled:opacity-50"
            type="button"
          >
            {loadingAction === "reset" ? "Sending..." : "Send Password Reset Email"}
          </button>

          {message && <p className="text-sm text-zinc-400">{message}</p>}

          {showDevAuth && (
            <div className="grid gap-2 border border-yellow-500/40 p-4">
              <p className="text-sm font-semibold text-yellow-300">
                Local development only.
              </p>
              <button
                onClick={() => router.push("/command-center?dev=true")}
                type="button"
                className="rounded-xl bg-yellow-300 p-4 font-semibold text-black"
              >
                Continue as Dev Tester
              </button>
            </div>
          )}

          <Link href="/" className="text-sm text-zinc-400 underline">
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
