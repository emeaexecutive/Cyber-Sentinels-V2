"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileFieldProps = {
  siteKey?: string | null;
  onTokenChange?(token: string): void;
  resetKey?: number;
};

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback(token: string): void;
      "error-callback"(): void;
      "expired-callback"(): void;
      "timeout-callback"(): void;
      "response-field": boolean;
    },
  ): string;
  reset(widgetId: string): void;
};

export function TurnstileField({ siteKey, onTokenChange, resetKey = 0 }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    const turnstile = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (!siteKey || !containerRef.current || !turnstile || widgetIdRef.current) return;

    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onTokenChange?.(token),
      "error-callback": () => onTokenChange?.(""),
      "expired-callback": () => onTokenChange?.(""),
      "timeout-callback": () => onTokenChange?.(""),
      "response-field": !onTokenChange,
    });
  }, [onTokenChange, siteKey]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  useEffect(() => {
    const turnstile = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (resetKey > 0 && turnstile && widgetIdRef.current) {
      turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  if (!siteKey) return null;

  return (
    <div className="grid gap-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} />
      <p className="text-xs text-zinc-500">Protected by Cloudflare Turnstile.</p>
    </div>
  );
}

type EnterpriseAccessFormProps = {
  buttonLabel: string;
  designPartner: boolean;
};

export function EnterpriseAccessForm({ buttonLabel, designPartner }: EnterpriseAccessFormProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [turnstileToken, setTurnstileToken] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!turnstileToken) {
      setError("Complete the security check before submitting.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("cf-turnstile-response", turnstileToken);
    console.debug(
      "Enterprise Access FormData entries",
      Array.from(formData.entries(), ([key, value]) => [
        key,
        key === "cf-turnstile-response" ? `[token:${String(value).length}]` : "[redacted]",
      ]),
    );

    setSubmitting(true);
    try {
      const response = await fetch("/api/enterprise-access", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        setError(result.error ?? "We could not submit your request. Please try again.");
        setTurnstileToken("");
        setResetKey((value) => value + 1);
        return;
      }

      window.location.assign(
        response.redirected ? response.url : "/enterprise-access?success=true",
      );
    } catch {
      setError("We could not submit your request. Please try again.");
      setTurnstileToken("");
      setResetKey((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <input type="hidden" name="design_partner_interest" value={designPartner ? "true" : "false"} />
      <label className="grid gap-2 text-sm text-zinc-300">Name<input required name="name" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">Work email<input required name="work_email" type="email" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">Company<input required name="company" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">
        Operational trust concern
        <select name="current_problem_category" defaultValue="" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
          <option value="" disabled>Select the closest concern</option>
          <option value="ai_identity">AI-agent governance and authorization</option>
          <option value="auditability">Replay continuity and Evidence Chain</option>
          <option value="human_review">Governance Review and escalation</option>
          <option value="session_integrity">Continuous Verification and Session Integrity</option>
          <option value="hiring_security">Hiring Security workflow</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm text-zinc-300">Requirements<textarea name="message" rows={5} placeholder="Workflow, verification evidence, review or pilot requirements" className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <TurnstileField
        siteKey={siteKey}
        onTokenChange={setTurnstileToken}
        resetKey={resetKey}
      />
      {error ? <p className="text-sm text-amber-200">{error}</p> : null}
      <button
        type="submit"
        disabled={!turnstileToken || submitting}
        className="brand-primary-action w-full p-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : buttonLabel}
      </button>
    </form>
  );
}
