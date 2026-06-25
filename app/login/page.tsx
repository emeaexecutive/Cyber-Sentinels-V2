"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RATE_LIMIT_MESSAGE =
  "Email login is temporarily rate-limited. Use password login or wait before requesting another magic link.";
const CONNECTION_FAILURE_MESSAGE =
  "Cyber Sentinels could not connect. Check Vercel Production environment variables.";
const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const authTimeoutMs = 8000;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const authAttemptWindowMs = 60_000;
const authAttemptLimit = 8;

declare global {
  interface Window {
    onCyberSentinelsLoginTurnstile?: (token: string) => void;
  }
}

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

function getBoundaryCopy(path: string) {
  if (path.startsWith("/admin") || path.startsWith("/back-office")) {
    return "Admin and internal tooling require verified staff access before any operational controls are shown.";
  }

  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/workspace") ||
    path.startsWith("/passport") ||
    path.startsWith("/trust") ||
    path.startsWith("/replay") ||
    path.startsWith("/verification/receipt")
  ) {
    return "This destination contains operational trust data, including verification evidence, reviewer actions or customer workflow records.";
  }

  return "Protected workflow pages require sign-in before evidence, reviews or receipts are shown.";
}

async function withAuthTimeout<T>(task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Supabase auth timed out after ${authTimeoutMs / 1000} seconds.`)),
          authTimeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [nextPath, setNextPath] = useState("/passport");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "create-account" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);
  const boundaryCopy = getBoundaryCopy(nextPath);

  useEffect(() => {
    window.onCyberSentinelsLoginTurnstile = (token: string) => setTurnstileToken(token);

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


  function allowAuthAttempt(action: string) {
    if (turnstileSiteKey && !turnstileToken) {
      setMessage("Security check failed. Please try again.");
      return false;
    }

    const now = Date.now();
    const key = `cyber_sentinels_auth_attempts_${action}`;
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) as { count?: number; resetAt?: number } : null;

    if (!parsed || !parsed.resetAt || parsed.resetAt < now) {
      window.localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + authAttemptWindowMs }));
      return true;
    }

    const count = Number(parsed.count ?? 0) + 1;
    window.localStorage.setItem(key, JSON.stringify({ count, resetAt: parsed.resetAt }));

    if (count > authAttemptLimit) {
      setMessage("Too many attempts. Please wait and try again.");
      return false;
    }

    return true;
  }

  function getSupabaseClient() {
    try {
      return createClient();
    } catch (error) {
      console.error("Supabase browser client creation failed.", error);
      setMessage(CONNECTION_FAILURE_MESSAGE);
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

    if (!allowAuthAttempt("password")) return;

    setMessage("");
    setLoadingAction("password");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
      );

      if (error) {
        setMessage(error.message || "Could not sign in.");
        return;
      }

      window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
      router.push(nextPath);
    } catch (error) {
      console.error("Supabase password sign-in failed.", error);
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setLoadingAction(null);
    }
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

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!allowAuthAttempt("create-account")) return;

    setMessage("");
    setLoadingAction("create-account");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath || "/passport"
            )}`,
          },
        })
      );

      if (error) {
        setMessage(error.message || "Could not create account.");
        return;
      }

      setMessage("Check your email to verify your account before continuing.");
    } catch (error) {
      console.error("Supabase account creation failed.", error);
      setMessage(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function signInWithMagicLink() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!allowAuthAttempt("magic-link")) return;

    setMessage("");
    setLoadingAction("magic-link");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath || "/passport"
            )}`,
          },
        })
      );

      if (error) {
        setMessage(isRateLimitError(error.message) ? RATE_LIMIT_MESSAGE : error.message);
        return;
      }

      setMessage("Magic link sent. Check your email.");
    } catch (error) {
      console.error("Supabase magic-link sign-in failed.", error);
      setMessage(error instanceof Error ? error.message : "Could not send magic link.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function sendPasswordResetEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    if (!allowAuthAttempt("reset")) return;

    setMessage("");
    setLoadingAction("reset");

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      );

      if (error) {
        setMessage(error.message || "Could not send password reset email.");
        return;
      }

      setMessage("Password reset email sent. Check your email.");
    } catch (error) {
      console.error("Supabase password reset email failed.", error);
      setMessage(
        error instanceof Error ? error.message : "Could not send password reset email."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  const actionDisabled = loadingAction !== null;

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
            Account Access
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Sign in or create an account
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Access protected verification workflows, operational evidence and governance review systems.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Enterprise workspaces require verified email access.
          </p>

          <div className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Protected operational area
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {boundaryCopy}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              After sign-in, Cyber Sentinels returns you to {nextPath}.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          <div className="grid gap-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Account access
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Sign in with your verified workspace email, or create an account and confirm it before entering protected workflows.
              </p>
            </div>

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

            {turnstileSiteKey ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onCyberSentinelsLoginTurnstile" />
              </div>
            ) : null}

            <button
              onClick={signInWithPassword}
              disabled={actionDisabled}
              className="rounded-xl bg-white p-4 font-semibold text-black transition hover:bg-cyan-100 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "password" ? "Signing in..." : "Sign in"}
            </button>

            <div className="grid gap-3 rounded-xl border border-zinc-900 bg-zinc-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                New workspace access
              </p>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Confirm password"
                autoComplete="new-password"
                className="rounded-xl border border-zinc-800 bg-black p-4 text-white"
              />
              <p className="text-xs leading-5 text-zinc-500">
                Account creation sends an email verification link before protected workflows are available.
              </p>
            </div>

            <button
              onClick={createAccountWithPassword}
              disabled={actionDisabled}
              className="rounded-xl border border-zinc-700 p-4 font-semibold text-zinc-100 transition hover:border-cyan-800 hover:text-cyan-100 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "create-account" ? "Creating..." : "Create account"}
            </button>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-900 pt-2 text-sm">
              <button
                onClick={signInWithMagicLink}
                disabled={actionDisabled}
                className="text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                type="button"
              >
                {loadingAction === "magic-link" ? "Sending magic link..." : "Use magic link"}
              </button>

              <button
                onClick={sendPasswordResetEmail}
                disabled={actionDisabled}
                className="text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                type="button"
              >
                {loadingAction === "reset" ? "Sending reset..." : "Forgot password?"}
              </button>
            </div>

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
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
