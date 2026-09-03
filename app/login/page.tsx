"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TurnstileField } from "@/components/turnstile-field";
import {
  classifyAuthFailure,
  maskEmailAddress,
  rateLimitedMessage,
  type LoginExperienceState,
} from "@/lib/auth/login-experience";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateNewPassword,
} from "@/lib/auth/password-recovery";
import { resolveSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { shouldUsePreviewTurnstileFallback } from "@/components/turnstile-field";

const CONNECTION_FAILURE_MESSAGE =
  "We couldn't connect. Please try again shortly.";
const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const REMEMBER_SESSION_KEY = "cyber_sentinels_remember_session";
const authTimeoutMs = 8000;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function shouldRequireTurnstile() {
  return process.env.NODE_ENV === "production" && !shouldUsePreviewTurnstileFallback();
}
const authAttemptWindowMs = 60_000;
const authAttemptLimit = 8;

type AuthMode = "sign-in" | "create-account" | "forgot-password";

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
  const [experienceState, setExperienceState] = useState<LoginExperienceState>("SIGNED_OUT");
  const [signupSucceeded, setSignupSucceeded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [nextPath, setNextPath] = useState("/operational-entities");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "create-account" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);
  const trimmedEmail = email.trim();
  const passwordsMismatch =
    authMode === "create-account" && Boolean(confirmPassword) && password !== confirmPassword;
  const canCreateAccount =
    Boolean(trimmedEmail) &&
    password.length >= PASSWORD_MIN_LENGTH &&
    Boolean(confirmPassword) &&
    password === confirmPassword &&
    loadingAction === null;
  const canSendEmailOnlyAction = Boolean(trimmedEmail) && loadingAction === null;
  const maskedEmail = maskEmailAddress(trimmedEmail);

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setMessage("");
    setExperienceState("SIGNED_OUT");
    setSignupSucceeded(false);
    setPassword("");
    setConfirmPassword("");
  }

  function showAuthFailure(error: unknown, fallback: string) {
    const failure = classifyAuthFailure(error, fallback);
    setExperienceState(failure.state);
    setMessage(failure.message);
  }

  function showSecurityFailure() {
    setExperienceState("SECURITY_VERIFICATION_FAILED");
    setMessage("We couldn't complete the security check. Please try again.");
  }

  useEffect(() => {
    setShowDevAuth(
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" &&
        window.location.hostname === "localhost"
    );

    const searchParams = new URLSearchParams(window.location.search);
    const resolvedNextPath = resolveSafeInternalRedirect(
      searchParams.get("next"),
      window.location.origin,
    );

    const restoresSession =
      window.localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
    setNextPath(resolvedNextPath);
    setRememberSession(restoresSession);

    if (searchParams.get("expired") === "1") {
      window.localStorage.removeItem(SESSION_START_KEY);
      setMessage("Session expired for security. Please sign in again.");
      setExperienceState("SIGNED_OUT");
      return;
    }

    if (searchParams.get("error") === "missing_verification_code") {
      setMessage("The verification link was missing a setup code. Please request a new sign-in link.");
    }

    if (searchParams.get("error") === "verification_failed") {
      setMessage("We could not complete email verification. Please request a new link or sign in with your password.");
    }

    if (searchParams.get("mode") === "forgot-password") {
      setAuthMode("forgot-password");
    }

    if (searchParams.get("password_updated") === "1") {
      setMessage("Password updated successfully. Sign in with your new password.");
    }

    if (searchParams.get("error") === "recovery_link_invalid") {
      setAuthMode("forgot-password");
      setMessage("Reset link expired or invalid. Request a new password reset email.");
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    let active = true;

    withAuthTimeout(supabase.auth.getUser())
      .then(async ({ data }) => {
        if (!active) return;

        if (data.user) {
          setExperienceState("AUTHENTICATED");
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

        setExperienceState("SIGNED_OUT");
      })
      .catch((error) => {
        console.error("Supabase session restoration failed.", error);
        if (active) setExperienceState("SIGNED_OUT");
      });

    return () => {
      active = false;
    };
  }, [router]);


  function allowAuthAttempt(action: string) {
    if (shouldRequireTurnstile() && !turnstileSiteKey) {
      showSecurityFailure();
      return false;
    }
    if (turnstileSiteKey && !turnstileToken) {
      showSecurityFailure();
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
      setExperienceState("RATE_LIMITED");
      setMessage(rateLimitedMessage);
      return false;
    }

    return true;
  }

  async function verifyTurnstileForAuth() {
    if (!turnstileSiteKey) return !shouldRequireTurnstile();

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
      setTurnstileResetKey((value) => value + 1);

      if (!response.ok || !result.ok) {
        if (response.status === 429) {
          setExperienceState("RATE_LIMITED");
          setMessage(rateLimitedMessage);
        } else {
          showSecurityFailure();
        }
        return false;
      }

      return true;
    } catch {
      showSecurityFailure();
      return false;
    }
  }

  function getSupabaseClient() {
    try {
      return createClient();
    } catch (error) {
      console.error("Supabase browser client creation failed.", error);
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(CONNECTION_FAILURE_MESSAGE);
      return null;
    }
  }

  async function signInWithPassword() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Please enter your password.");
      return;
    }

    if (!allowAuthAttempt("password")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
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
        showAuthFailure(error, "We couldn't sign you in. Please try again.");
        return;
      }

      window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
      window.localStorage.setItem(REMEMBER_SESSION_KEY, rememberSession ? "true" : "false");
      await recordAuthEvent("login", nextPath, rememberSession, {
        method: "password",
      });
      setExperienceState("AUTHENTICATED");
      router.push(nextPath);
    } catch (error) {
      console.error("Supabase password sign-in failed.", error);
      showAuthFailure(error, "We couldn't sign you in. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function createAccountWithPassword() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Please enter your email address.");
      return;
    }

    const passwordPolicyError = validateNewPassword(password);
    if (passwordPolicyError) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(passwordPolicyError);
      return;
    }

    if (password !== confirmPassword) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Passwords do not match.");
      return;
    }

    if (!allowAuthAttempt("create-account")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
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
      const { data, error } = await withAuthTimeout(
        supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath || "/operational-entities"
            )}`,
          },
        })
      );

      if (error) {
        showAuthFailure(error, "We couldn't create your account. Please try again.");
        return;
      }

      if (data.session?.user) {
        window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        await recordAuthEvent("signup_session_created", nextPath, true, {
          authenticated_to: nextPath,
        });
        setExperienceState("AUTHENTICATED");
        router.replace(nextPath);
        return;
      }

      setSignupSucceeded(true);
      setExperienceState("EMAIL_VERIFICATION_REQUIRED");
      setMessage("");
    } catch (error) {
      console.error("Supabase account creation failed.", error);
      showAuthFailure(error, "We couldn't create your account. Please try again.");
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
    setExperienceState("SIGNING_IN");
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
              nextPath || "/operational-entities"
            )}`,
          },
        })
      );

      if (error) {
        showAuthFailure(error, "We couldn't resend the email. Please try again.");
        return;
      }

      setExperienceState("EMAIL_VERIFICATION_REQUIRED");
      setMessage("Email sent again.");
    } catch (error) {
      console.error("Supabase verification resend failed.", error);
      showAuthFailure(error, "We couldn't resend the email. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function signInWithMagicLink() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Please enter your email address.");
      return;
    }

    if (!allowAuthAttempt("magic-link")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
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
              nextPath || "/operational-entities"
            )}`,
          },
        })
      );

      if (error) {
        showAuthFailure(error, "We couldn't send the sign-in link. Please try again.");
        return;
      }

      setExperienceState("SIGNED_OUT");
      setMessage("Check your email for your sign-in link.");
    } catch (error) {
      console.error("Supabase magic-link sign-in failed.", error);
      showAuthFailure(error, "We couldn't send the sign-in link. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function sendPasswordResetEmail() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("Please enter your email address.");
      return;
    }

    if (!allowAuthAttempt("reset")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("reset");

    try {
      const correlationId = crypto.randomUUID();
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({ email: trimmedEmail, turnstileToken }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        message?: string;
      };
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);

      if (!response.ok || !result.ok) {
        if (response.status === 429) {
          setExperienceState("RATE_LIMITED");
          setMessage("Too many reset emails have been requested. Please wait and try again.");
        } else if (result.code?.startsWith("TURNSTILE")) {
          showSecurityFailure();
        } else {
          setExperienceState("AUTHENTICATION_FAILED");
          setMessage("We couldn't send the reset email. Please try again.");
        }
        return;
      }

      setExperienceState("SIGNED_OUT");
      setMessage(result.message || PASSWORD_RESET_GENERIC_MESSAGE);
    } catch {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage("We couldn't send the reset email. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  }

  const actionDisabled = loadingAction !== null;
  const securityPending = Boolean(turnstileSiteKey && !turnstileToken);
  const submitDisabled = actionDisabled || securityPending;
  const messageIsError = [
    "AUTHENTICATION_FAILED",
    "SECURITY_VERIFICATION_FAILED",
    "RATE_LIMITED",
  ].includes(experienceState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#04070c] px-5 py-12 text-white sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-black p-6 shadow-2xl shadow-black/40 sm:p-8">
        <Link href="/" className="text-xs font-semibold tracking-[0.22em] text-cyan-200">
          CYBER SENTINELS
        </Link>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Operational Trust Control Plane</p>

        {signupSucceeded ? (
          <div className="mt-8" role="status" aria-live="polite">
            <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              We&apos;ve sent a verification link to:
            </p>
            <p className="mt-1 font-medium text-zinc-100">{maskedEmail}</p>
            {turnstileSiteKey ? (
              <div className="mt-5">
                <TurnstileField
                  siteKey={turnstileSiteKey}
                  onTokenChange={setTurnstileToken}
                  onErrorChange={(error) => {
                    if (error) showSecurityFailure();
                  }}
                  resetKey={turnstileResetKey}
                  quiet
                />
              </div>
            ) : null}
            <button
              onClick={resendVerificationEmail}
              disabled={submitDisabled || !trimmedEmail}
              className="brand-secondary-action mt-7 w-full p-4 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "create-account" ? "Sending..." : "Resend email"}
            </button>
            <p className="mt-6 text-center text-sm text-zinc-400">Already verified?</p>
            <button
              onClick={() => switchAuthMode("sign-in")}
              disabled={actionDisabled}
              className="mt-2 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:border-zinc-500 disabled:opacity-50"
              type="button"
            >
              Continue to sign in
            </button>
            {message ? <p className="mt-4 text-sm text-zinc-300">{message}</p> : null}
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {authMode === "create-account"
                ? "Create your Cyber Sentinels account"
                : authMode === "forgot-password"
                  ? "Reset your password"
                  : "Sign in"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {authMode === "create-account"
                ? "Set up your workspace access."
                : authMode === "forgot-password"
                  ? "We'll email you instructions to choose a new password."
                  : "Access your Cyber Sentinels workspace."}
            </p>

            <div className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-zinc-200">
                {authMode === "create-account" ? "Work email" : "Email"}
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white outline-none focus:border-cyan-700"
                />
              </label>

              {authMode === "sign-in" || authMode === "create-account" ? (
                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  Password
                  <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      autoComplete={authMode === "create-account" ? "new-password" : "current-password"}
                      className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
              ) : null}

              {authMode === "create-account" ? (
                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  Confirm password
                  <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                      aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                  {passwordsMismatch ? <span className="text-sm text-red-300">Passwords do not match.</span> : null}
                </label>
              ) : null}

              {turnstileSiteKey ? (
                <TurnstileField
                  siteKey={turnstileSiteKey}
                  onTokenChange={setTurnstileToken}
                  onErrorChange={(error) => {
                    if (error) showSecurityFailure();
                  }}
                  resetKey={turnstileResetKey}
                  quiet
                />
              ) : shouldRequireTurnstile() ? (
                <p className="rounded-xl border border-red-900 bg-red-950/20 p-3 text-sm text-red-200" role="alert">
                  We couldn&apos;t complete the security check. Please try again.
                </p>
              ) : null}

              {authMode === "sign-in" ? (
                <>
                  <button
                    onClick={signInWithPassword}
                    disabled={submitDisabled}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "password" ? "Signing in..." : "Sign in"}
                  </button>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex items-center gap-2 text-zinc-300">
                      <input
                        checked={rememberSession}
                        onChange={(event) => setRememberSession(event.target.checked)}
                        type="checkbox"
                      />
                      Remember me
                    </label>
                    <button
                      onClick={() => switchAuthMode("forgot-password")}
                      className="text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                      type="button"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600" aria-hidden="true">
                    <span className="h-px flex-1 bg-zinc-800" />
                    or
                    <span className="h-px flex-1 bg-zinc-800" />
                  </div>
                  <button
                    onClick={signInWithMagicLink}
                    disabled={submitDisabled || !canSendEmailOnlyAction}
                    className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:border-zinc-500 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "magic-link" ? "Sending..." : "Use magic link"}
                  </button>
                  <p className="text-center text-sm text-zinc-400">
                    New to Cyber Sentinels?{" "}
                    <button
                      onClick={() => switchAuthMode("create-account")}
                      className="font-semibold text-white underline-offset-4 hover:underline"
                      type="button"
                    >
                      Create account
                    </button>
                  </p>
                </>
              ) : null}

              {authMode === "create-account" ? (
                <>
                  <button
                    onClick={createAccountWithPassword}
                    disabled={submitDisabled || !canCreateAccount}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "create-account" ? "Creating..." : "Create account"}
                  </button>
                  <button
                    onClick={() => switchAuthMode("sign-in")}
                    className="text-sm text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                    type="button"
                  >
                    Already have an account? Sign in
                  </button>
                </>
              ) : null}

              {authMode === "forgot-password" ? (
                <>
                  <button
                    onClick={sendPasswordResetEmail}
                    disabled={submitDisabled || !canSendEmailOnlyAction}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "reset" ? "Sending..." : "Send reset link"}
                  </button>
                  <button
                    onClick={() => switchAuthMode("sign-in")}
                    className="text-sm text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                    type="button"
                  >
                    Back to sign in
                  </button>
                </>
              ) : null}

              {message ? (
                <p
                  role={messageIsError ? "alert" : "status"}
                  aria-live="polite"
                  className={messageIsError ? "text-sm text-red-300" : "text-sm text-zinc-300"}
                >
                  {message}
                </p>
              ) : null}

              {showDevAuth ? (
                <div className="grid gap-2 border-t border-zinc-800 pt-5">
                  <p className="text-xs text-yellow-300">Local development only</p>
                  <button
                    onClick={() => router.push("/passport?dev=true")}
                    type="button"
                    className="rounded-xl border border-yellow-500/40 p-3 text-sm font-semibold text-yellow-200"
                  >
                    Continue as Dev Tester
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
