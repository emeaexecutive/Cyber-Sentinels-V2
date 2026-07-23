"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const RATE_LIMIT_MESSAGE =
  "Email login is temporarily rate-limited. Use password login or wait before requesting another magic link.";
const CONNECTION_FAILURE_MESSAGE =
  "Cyber Sentinels could not connect. Please try again shortly.";
const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const REMEMBER_SESSION_KEY = "cyber_sentinels_remember_session";
const authTimeoutMs = 8000;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const authAttemptWindowMs = 60_000;
const authAttemptLimit = 8;

type AuthMode = "sign-in" | "create-account" | "magic-link" | "forgot-password";

const primaryAuthModes: { id: Extract<AuthMode, "sign-in" | "create-account">; label: string }[] = [
  { id: "sign-in", label: "Sign in" },
  { id: "create-account", label: "Create account" },
];

declare global {
  interface Window {
    onCyberSentinelsLoginTurnstile?: (token: string) => void;
    turnstile?: {
      reset: () => void;
    };
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

function safeAuthMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  if (isRateLimitError(message)) return RATE_LIMIT_MESSAGE;
  if (normalized.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (normalized.includes("email not confirmed")) return "Verify your email before signing in.";
  if (normalized.includes("user already registered")) return "An account already exists for this email. Sign in or reset your password.";
  return fallback;
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

async function recordAuthEvent(
  eventType: string,
  nextPath: string,
  rememberSession: boolean,
  context: Record<string, unknown> = {}
) {
  try {
    await fetch("/api/auth/replay-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        decision: "allow",
        context: {
          next_path: nextPath,
          remember_session: rememberSession,
          ...context,
        },
      }),
    });
  } catch (error) {
    console.warn("Auth replay event could not be recorded.", error);
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [message, setMessage] = useState("");
  const [sessionRestoreState, setSessionRestoreState] = useState<
    "checking" | "restored" | "signed-out" | "unavailable"
  >("checking");
  const [signupSucceeded, setSignupSucceeded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [nextPath, setNextPath] = useState("/passport");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "create-account" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);
  const boundaryCopy = getBoundaryCopy(nextPath);
  const trimmedEmail = email.trim();
  const passwordsMismatch =
    authMode === "create-account" && Boolean(confirmPassword) && password !== confirmPassword;
  const canCreateAccount =
    Boolean(trimmedEmail) &&
    password.length >= 6 &&
    Boolean(confirmPassword) &&
    password === confirmPassword &&
    loadingAction === null;
  const canSendEmailOnlyAction = Boolean(trimmedEmail) && loadingAction === null;
  const modeTitle =
    authMode === "sign-in"
      ? "Sign in"
      : authMode === "create-account"
        ? "Create account"
        : authMode === "magic-link"
          ? "Use magic link"
          : "Reset password";

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage("");
    setSignupSucceeded(false);
    setPassword("");
    setConfirmPassword("");
  }

  useEffect(() => {
    window.onCyberSentinelsLoginTurnstile = (token: string) => setTurnstileToken(token);

    setShowDevAuth(
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" &&
        window.location.hostname === "localhost"
    );

    const searchParams = new URLSearchParams(window.location.search);
    const resolvedNextPath = getSafeRedirect(searchParams.get("next"));

    const restoresSession =
      window.localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
    setNextPath(resolvedNextPath);
    setRememberSession(restoresSession);

    if (searchParams.get("expired") === "1") {
      window.localStorage.removeItem(SESSION_START_KEY);
      setMessage("Session expired for security. Please sign in again.");
      setSessionRestoreState("signed-out");
      return;
    }

    if (searchParams.get("error") === "missing_verification_code") {
      setMessage("The verification link was missing a setup code. Please request a new sign-in link.");
    }

    if (searchParams.get("error") === "verification_failed") {
      setMessage("We could not complete email verification. Please request a new link or sign in with your password.");
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setSessionRestoreState("unavailable");
      return;
    }

    let active = true;

    withAuthTimeout(supabase.auth.getSession())
      .then(async ({ data }) => {
        if (!active) return;

        if (data.session?.user) {
          setSessionRestoreState("restored");
          window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
          await recordAuthEvent(
            "session_restoration",
            resolvedNextPath,
            restoresSession,
            { restored_to: resolvedNextPath }
          );
          router.replace(resolvedNextPath);
          return;
        }

        setSessionRestoreState("signed-out");
      })
      .catch((error) => {
        console.error("Supabase session restoration failed.", error);
        if (active) setSessionRestoreState("unavailable");
      });

    return () => {
      active = false;
    };
  }, [router]);


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

  async function verifyTurnstileForAuth() {
    if (!turnstileSiteKey) return true;

    try {
      const response = await fetch("/api/auth/turnstile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      setTurnstileToken("");
      window.turnstile?.reset();

      if (!response.ok || !result.ok) {
        setMessage(
          response.status === 429
            ? "Too many security checks. Please wait and try again."
            : result.error || "Security check failed. Please try again."
        );
        return false;
      }

      return true;
    } catch {
      setMessage("Security check is temporarily unavailable.");
      return false;
    }
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

    if (!(await verifyTurnstileForAuth())) {
      setLoadingAction(null);
      return;
    }

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
        setMessage(safeAuthMessage(error, "Could not sign in. Please try again."));
        return;
      }

      window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
      window.localStorage.setItem(REMEMBER_SESSION_KEY, rememberSession ? "true" : "false");
      await recordAuthEvent("login", nextPath, rememberSession, {
        method: "password",
      });
      router.push(nextPath);
    } catch (error) {
      console.error("Supabase password sign-in failed.", error);
      setMessage(safeAuthMessage(error, "Could not sign in. Please try again."));
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

    if (!(await verifyTurnstileForAuth())) {
      setLoadingAction(null);
      return;
    }

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
        setMessage(safeAuthMessage(error, "Could not create the account. Please review the details and try again."));
        return;
      }

      setSignupSucceeded(true);
      setMessage("Check your email to verify your account before continuing.");
    } catch (error) {
      console.error("Supabase account creation failed.", error);
      setMessage(safeAuthMessage(error, "Could not create the account. Please try again."));
    } finally {
      setLoadingAction(null);
    }
  }

  async function resendVerificationEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage("Please enter the email address you used to create your account.");
      return;
    }

    if (!allowAuthAttempt("create-account")) return;

    setMessage("");
    setLoadingAction("create-account");

    if (!(await verifyTurnstileForAuth())) {
      setLoadingAction(null);
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        supabase.auth.resend({
          type: "signup",
          email: trimmedEmail,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath || "/passport"
            )}`,
          },
        })
      );

      if (error) {
        setMessage(safeAuthMessage(error, "Could not resend the verification email. Please try again shortly."));
        return;
      }

      setMessage("Verification email resent. Check your inbox and spam or junk folder.");
    } catch (error) {
      console.error("Supabase verification resend failed.", error);
      setMessage(safeAuthMessage(error, "Could not resend the verification email. Please try again shortly."));
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

    if (!(await verifyTurnstileForAuth())) {
      setLoadingAction(null);
      return;
    }

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
        setMessage(safeAuthMessage(error, "Could not send the magic link. Please try again."));
        return;
      }

      setMessage("Check your email for a secure sign-in link.");
    } catch (error) {
      console.error("Supabase magic-link sign-in failed.", error);
      setMessage(safeAuthMessage(error, "Could not send the magic link. Please try again."));
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

    if (!(await verifyTurnstileForAuth())) {
      setLoadingAction(null);
      return;
    }

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
        setMessage(safeAuthMessage(error, "Could not send the password reset email. Please try again shortly."));
        return;
      }

      setMessage("If the account exists, password reset instructions have been sent.");
    } catch (error) {
      console.error("Supabase password reset email failed.", error);
      setMessage(safeAuthMessage(error, "Could not send the password reset email. Please try again shortly."));
    } finally {
      setLoadingAction(null);
    }
  }

  const actionDisabled = loadingAction !== null;

  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white sm:px-6 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">
            Account Access
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Sign in or create an account
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-300">
            Access protected verification workflows, operational evidence and governance review systems.
          </p>
          <p className="mt-3 text-sm text-zinc-400">
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
              <h2 className="text-lg font-semibold text-zinc-100">{modeTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Sign in with your verified workspace email, or choose another secure account option.
              </p>
              <div className="mt-4 rounded-xl border border-zinc-900 bg-zinc-950/50 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  Session continuity
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {sessionRestoreState === "checking"
                    ? "Checking for a trusted session..."
                    : sessionRestoreState === "restored"
                      ? "Trusted session restored."
                      : sessionRestoreState === "unavailable"
                        ? "Session restoration is unavailable; sign in again."
                        : "No active session found."}
                </p>
                {sessionRestoreState === "checking" ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full w-1/2 rounded-full bg-cyan-400/70" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-900 bg-zinc-950/60 p-2">
              {primaryAuthModes.map((mode) => {
                const selected = authMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    onClick={() => switchAuthMode(mode.id)}
                    type="button"
                    aria-pressed={selected}
                    className={`min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selected
                        ? "bg-white text-black"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {authMode === "magic-link" || authMode === "forgot-password" ? (
              <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  {authMode === "magic-link" ? "Email sign-in" : "Password recovery"}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {authMode === "magic-link"
                    ? "Send a secure sign-in link to your verified workspace email."
                    : "Send password reset instructions without disclosing whether an account exists."}
                </p>
              </div>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-zinc-300">
              Email
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSignupSucceeded(false);
                }}
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white"
              />
            </label>

            {authMode === "sign-in" || authMode === "create-account" ? (
              <label className="grid gap-2 text-sm font-medium text-zinc-300">
                Password
                <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  <input
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setSignupSucceeded(false);
                    }}
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete={authMode === "create-account" ? "new-password" : "current-password"}
                    className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="border-l border-zinc-800 px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>
            ) : null}

            {authMode === "sign-in" ? (
              <label className="flex items-start gap-3 rounded-xl border border-zinc-900 bg-zinc-950/50 p-4 text-sm text-zinc-300">
                <input
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  type="checkbox"
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-zinc-100">Remember this browser</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    Restore trusted sessions automatically when Supabase session cookies remain valid.
                  </span>
                </span>
              </label>
            ) : null}

            {turnstileSiteKey ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-callback="onCyberSentinelsLoginTurnstile" />
              </div>
            ) : null}

            {authMode === "create-account" ? (
              <div className="grid gap-3 rounded-xl border border-cyan-900 bg-cyan-950/10 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                  New workspace access
                </p>
                <label className="grid gap-2 text-sm font-medium text-zinc-300">
                  Confirm Password
                  <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-black">
                    <input
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setSignupSucceeded(false);
                      }}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="border-l border-zinc-800 px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                      aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                {passwordsMismatch ? (
                  <p className="text-sm text-red-300">Passwords do not match.</p>
                ) : null}
                <p className="text-xs leading-5 text-zinc-500">
                  Account creation sends an email verification link before protected workflows are available.
                </p>
              </div>
            ) : null}

            {authMode === "sign-in" ? (
              <button
                onClick={signInWithPassword}
                disabled={actionDisabled}
                className="brand-primary-action w-full p-4 disabled:opacity-50"
                type="button"
              >
                {loadingAction === "password" ? "Signing in..." : "Sign in"}
              </button>
            ) : null}

            {authMode === "create-account" ? (
              <button
                onClick={createAccountWithPassword}
                disabled={actionDisabled || !canCreateAccount}
                className="brand-secondary-action w-full p-4 disabled:opacity-50"
                type="button"
              >
                {loadingAction === "create-account" ? "Creating..." : "Create account"}
              </button>
            ) : null}

            {authMode === "magic-link" ? (
              <button
                onClick={signInWithMagicLink}
                disabled={!canSendEmailOnlyAction}
                className="nav-control w-full justify-center p-4 disabled:opacity-50"
                type="button"
              >
                {loadingAction === "magic-link" ? "Sending magic link..." : "Send magic link"}
              </button>
            ) : null}

            {authMode === "forgot-password" ? (
              <button
                onClick={sendPasswordResetEmail}
                disabled={!canSendEmailOnlyAction}
                className="nav-control w-full justify-center p-4 disabled:opacity-50"
                type="button"
              >
                {loadingAction === "reset" ? "Sending reset..." : "Send password reset"}
              </button>
            ) : null}

            {signupSucceeded ? (
              <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4">
                <p className="text-sm font-semibold text-cyan-100">
                  Check your email to verify your account before continuing.
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  We sent the verification link to {trimmedEmail || "your email address"}.
                  Check spam or junk mail, and make sure the email address is correct before requesting another link.
                </p>
                <button
                  onClick={resendVerificationEmail}
                  disabled={actionDisabled || !trimmedEmail}
                  className="mt-4 rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-500 disabled:opacity-50"
                  type="button"
                >
                  {loadingAction === "create-account" ? "Sending..." : "Resend verification"}
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800 pt-4 text-sm">
              {authMode !== "sign-in" ? (
                <button
                  onClick={() => switchAuthMode("sign-in")}
                  disabled={actionDisabled}
                  className="font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                  type="button"
                >
                  Back to sign in
                </button>
              ) : null}

              {authMode !== "create-account" ? (
                <button
                  onClick={() => switchAuthMode("create-account")}
                  disabled={actionDisabled}
                  className="text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                  type="button"
                >
                  Create account
                </button>
              ) : null}

              {authMode !== "magic-link" ? (
                <button
                  onClick={() => switchAuthMode("magic-link")}
                  disabled={actionDisabled}
                  className="text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                  type="button"
                >
                  Use magic link
                </button>
              ) : null}

              {authMode !== "forgot-password" ? (
                <button
                  onClick={() => switchAuthMode("forgot-password")}
                  disabled={actionDisabled}
                  className="text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
                  type="button"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>

            {message ? <p role="status" aria-live="polite" className="text-sm text-zinc-300">{message}</p> : null}

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
