"use client";

import Link from "next/link";
import { useState } from "react";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "@/lib/auth/password-recovery";

type CompletionResponse = {
  ok?: boolean;
  code?: string;
  error?: string;
  message?: string;
  next?: string;
};

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [nextPath, setNextPath] = useState("/login?password_updated=1");
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    setMessage("");

    const policyError = validateNewPassword(password);
    if (policyError) {
      setMessage(policyError);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (needsNonce && !nonce) {
      setMessage("Enter the security code we sent to your email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword, ...(nonce ? { nonce } : {}) }),
      });
      const result = (await response.json().catch(() => ({}))) as CompletionResponse;

      if (!response.ok || !result.ok) {
        if (result.code === "REAUTHENTICATION_REQUIRED") {
          setNeedsNonce(true);
        }
        setMessage(result.error || "We couldn't update your password. Request a new reset link and try again.");
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setNonce("");
      setSuccess(true);
      setNextPath(result.next || "/login?password_updated=1");
      setMessage(result.message || "Password updated successfully.");
    } catch {
      setMessage("We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8" role="status" aria-live="polite">
        <h1 className="text-3xl font-semibold tracking-tight">Password updated successfully.</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          For your security, all existing sessions have been signed out. Sign in with your new password to continue.
        </p>
        <Link href={nextPath} className="brand-primary-action mt-7 block w-full p-4 text-center">
          Continue to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Use at least {PASSWORD_MIN_LENGTH} characters. This reset link can only be used once.
      </p>

      <div className="mt-7 grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          New password
          <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
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

        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          Confirm new password
          <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
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
        </label>

        {needsNonce ? (
          <label className="grid gap-2 text-sm font-medium text-zinc-200">
            Security code
            <input
              value={nonce}
              onChange={(event) => setNonce(event.target.value.trim())}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white outline-none focus:border-cyan-700"
            />
          </label>
        ) : null}

        <button
          onClick={updatePassword}
          disabled={loading}
          type="button"
          className="brand-primary-action w-full p-4 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        {message ? (
          <p role="alert" aria-live="polite" className="text-sm text-red-300">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
