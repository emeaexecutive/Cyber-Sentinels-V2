"use client";

import Link from "next/link";
import { useState } from "react";
import { PASSWORD_MIN_LENGTH, validateNewPassword } from "@/lib/auth/password-recovery";

import { accountCopy, accountHref, type AccountLocale } from "@/lib/i18n/account";

type CompletionResponse = {
  ok?: boolean;
  code?: string;
  error?: string;
  message?: string;
  next?: string;
};

export function ResetPasswordForm({ locale = "en" }: { locale?: AccountLocale } = {}) {
  const copy = accountCopy[locale];
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [nextPath, setNextPath] = useState(accountHref("/login?password_updated=1", locale));
  const [loading, setLoading] = useState(false);

  async function updatePassword() {
    setMessage("");

    const policyError = validateNewPassword(password);
    if (policyError) {
      setMessage(copy.minimum.replace("{minimum}", String(PASSWORD_MIN_LENGTH)));
      return;
    }

    if (password !== confirmPassword) {
      setMessage(copy.mismatch);
      return;
    }

    if (needsNonce && !nonce) {
      setMessage(copy.nonceNeeded);
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
        const errors: Record<string, string> = { WEAK_PASSWORD: copy.weakPassword, RECOVERY_SIGN_OUT_FAILED: copy.signOutIncomplete, PASSWORD_MISMATCH: copy.mismatch, REAUTHENTICATION_REQUIRED: copy.nonceNeeded, REAUTHENTICATION_INVALID: copy.nonceInvalid, REAUTHENTICATION_FAILED: copy.nonceFailed, RECOVERY_SESSION_INVALID: copy.expiredTitle, WRONG_ORIGIN: copy.unverified };
        setMessage(locale === "en" ? result.error || copy.failure : errors[result.code ?? ""] || copy.failure);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setNonce("");
      setSuccess(true);
      setNextPath(accountHref("/login?password_updated=1", locale));
      setMessage(copy.success);
      window.location.replace(accountHref("/login?password_updated=1", locale));
    } catch {
      setMessage(copy.failure);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-8" role="status" aria-live="polite">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.success}</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          {copy.successBody}
        </p>
        <Link href={nextPath} className="brand-primary-action mt-7 block w-full p-4 text-center">
          {copy.continue}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold tracking-tight">{copy.newTitle}</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {copy.minimum.replace("{minimum}", String(PASSWORD_MIN_LENGTH))} {copy.singleUse}
      </p>

      <form className="mt-7 grid gap-5" onSubmit={(event) => { event.preventDefault(); void updatePassword(); }}>
        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          {copy.newPassword}
          <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
            <input
              aria-label={copy.newPassword}
              required
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
              aria-label={showPassword ? copy.hidePassword : copy.showPassword}
            >
              {showPassword ? copy.hide : copy.show}
            </button>
          </span>
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-200">
          {copy.confirmPassword}
          <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
            <input
              aria-label={copy.confirmPassword}
              required
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
              aria-label={showConfirmPassword ? copy.hideConfirm : copy.showConfirm}
            >
              {showConfirmPassword ? copy.hide : copy.show}
            </button>
          </span>
        </label>

        {needsNonce ? (
          <label className="grid gap-2 text-sm font-medium text-zinc-200">
            {copy.securityCode}
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
          disabled={loading}
          type="submit"
          className="brand-primary-action w-full p-4 disabled:opacity-50"
        >
          {loading ? copy.updating : copy.update}
        </button>

        {message ? (
          <p role="alert" aria-live="polite" className="text-sm text-red-300">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
