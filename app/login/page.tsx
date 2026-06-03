"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RATE_LIMIT_MESSAGE =
  "Email login is temporarily rate-limited. Use password login or wait before requesting another magic link.";
const SESSION_START_KEY = "cyber_sentinels_session_started_at";

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
    return "/passport";
  }

  return path;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [nextPath, setNextPath] = useState("/passport");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "create-account" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);

  useEffect(() => {
    setShowDevAuth(
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" &&
        window.location.hostname === "localhost"
    );

    const searchParams = new URLSearchParams(window.location.search);

    setNextPath(getSafeRedirect(searchParams.get("next")));

    if (searchParams.get("expired") === "1") {
      window.localStorage.removeItem(SESSION_START_KEY);
      setMessage("Session expired for security. Please sign in again.");
    }

    if (searchParams.get("error") === "missing_verification_code") {
      setMessage("The verification link was missing a setup code. Please request a new sign-in link.");
    }

    if (searchParams.get("error") === "verification_failed") {
      setMessage("We could not complete email verification. Please request a new link or sign in with your password.");
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
      setMessage(error.message || "Could not sign in.");
      return;
    }

    window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
    router.push(nextPath);
  }

  async function createAccountWithPassword() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!password || password.length < 6) {
      setMessage("Create a password with at least 6 characters.");
      return;
    }

    setMessage("");
    setLoadingAction("create-account");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextPath || "/passport"
        )}`,
      },
    });

    setLoadingAction(null);

    if (error) {
      setMessage(error.message || "Could not create account.");
      return;
    }

    setMessage(
      "Account created. Check your email if confirmation is required, then continue to your passport workflow."
    );
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
          nextPath || "/passport"
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
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
            User Account
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Create your Cyber Sentinels account
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Create account or sign in to create Trust Passports, upload
            evidence and manage your verification securely.
          </p>

          <div className="mt-6 grid gap-3 text-sm leading-6 text-zinc-400">
            <p>Users create passports.</p>
            <p>Users upload evidence.</p>
            <p>Users track verification progress.</p>
            <p>Admins review and approve or reject separately.</p>
          </div>

          <p className="mt-6 rounded-lg border border-zinc-800 bg-black p-3 text-xs text-zinc-500">
            Admin access is separate and protected. Normal users continue into
            the Trust Passport workflow, not Back Office.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          <div className="grid gap-4">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="Email address"
              autoComplete="email"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />

            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
            />

            <button
              onClick={signInWithPassword}
              disabled={loadingAction !== null}
              className="rounded-xl bg-white p-4 font-semibold text-black disabled:opacity-50"
              type="button"
            >
              {loadingAction === "password" ? "Signing in..." : "Sign in"}
            </button>

            <button
              onClick={createAccountWithPassword}
              disabled={loadingAction !== null}
              className="rounded-xl border border-cyan-800 p-4 font-semibold text-cyan-100 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "create-account" ? "Creating..." : "Create account"}
            </button>

            <button
              onClick={signInWithMagicLink}
              disabled={loadingAction !== null}
              className="rounded-xl border border-zinc-700 p-4 font-semibold text-white disabled:opacity-50"
              type="button"
            >
              {loadingAction === "magic-link" ? "Sending..." : "Send magic link"}
            </button>

            <button
              onClick={sendPasswordResetEmail}
              disabled={loadingAction !== null}
              className="rounded-xl border border-zinc-800 p-4 font-semibold text-zinc-200 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "reset" ? "Sending..." : "Send password reset"}
            </button>

            {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

            {showDevAuth ? (
              <div className="grid gap-2 border border-yellow-500/40 p-4">
                <p className="text-sm font-semibold text-yellow-300">
                  Local development only.
                </p>
                <button
                  onClick={() => router.push("/passport?dev=true")}
                  type="button"
                  className="rounded-xl bg-yellow-300 p-4 font-semibold text-black"
                >
                  Continue as Dev Tester
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <Link href="/" className="text-zinc-400 underline">
                Back to homepage
              </Link>
              <Link href="/admin/access" className="text-zinc-600 underline">
                Admin Access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
