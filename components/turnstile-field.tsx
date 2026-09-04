"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileFieldProps = {
  siteKey?: string | null;
  onTokenChange?(token: string): void;
  onErrorChange?(message: string): void;
  quiet?: boolean;
  resetKey?: number;
};

export type TurnstileRenderOptions = {
  sitekey: string;
  callback(token: string): void;
  "error-callback"(errorCode?: string | number): boolean;
  "expired-callback"(): void;
  "timeout-callback"(): void;
  "response-field": boolean;
  retry: "auto";
  "retry-interval": number;
  "refresh-expired": "auto";
  "refresh-timeout": "auto";
  appearance: "interaction-only";
};

export type TurnstileApi = {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove?(widgetId: string): void;
};

type WaitForTurnstileOptions = {
  readApi(): TurnstileApi | undefined;
  onReady(api: TurnstileApi): void;
  onTimeout(): void;
  schedule?(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  cancel?(timer: ReturnType<typeof setTimeout>): void;
  retryMs?: number;
  timeoutMs?: number;
};

export function waitForTurnstileApi({
  readApi,
  onReady,
  onTimeout,
  schedule = setTimeout,
  cancel = clearTimeout,
  retryMs = 100,
  timeoutMs = 10_000,
}: WaitForTurnstileOptions) {
  let stopped = false;
  let elapsedMs = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function check() {
    if (stopped) return;
    const api = readApi();
    if (api) {
      onReady(api);
      return;
    }
    if (elapsedMs >= timeoutMs) {
      onTimeout();
      return;
    }
    timer = schedule(() => {
      elapsedMs += retryMs;
      check();
    }, retryMs);
  }

  check();
  return () => {
    stopped = true;
    if (timer !== null) cancel(timer);
  };
}

function turnstileErrorMessage(errorCode?: string | number) {
  const code = String(errorCode ?? "");
  if (["110100", "110110", "400020", "400070"].includes(code)) {
    return "The security check is not configured correctly. Please contact support.";
  }
  if (code === "110200") {
    return "The security check is not authorised for this site. Please contact support.";
  }
  if (code === "200500") {
    return "The security check could not connect. Check blockers or your network, then reload.";
  }
  return "Security check failed. Please refresh the page and try again.";
}

export function shouldUsePreviewTurnstileFallback() {
  return false;
}

export function createTurnstileOptions(input: {
  siteKey: string;
  onToken(token: string): void;
  onError(message: string): void;
}): TurnstileRenderOptions {
  return {
    sitekey: input.siteKey,
    callback: (token) => {
      input.onError("");
      input.onToken(token);
    },
    "error-callback": (errorCode) => {
      input.onToken("");
      input.onError(turnstileErrorMessage(errorCode));
      return true;
    },
    "expired-callback": () => {
      input.onToken("");
      input.onError("The security check expired. Please complete it again.");
    },
    "timeout-callback": () => {
      input.onToken("");
      input.onError("The security check timed out. Please complete it again.");
    },
    "response-field": false,
    retry: "auto",
    "retry-interval": 2_000,
    "refresh-expired": "auto",
    "refresh-timeout": "auto",
    appearance: "interaction-only",
  };
}

export function TurnstileField({ siteKey, onTokenChange, onErrorChange, quiet = false, resetKey = 0 }: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const apiRef = useRef<TurnstileApi | null>(null);
  const onTokenChangeRef = useRef(onTokenChange);
  const onErrorChangeRef = useRef(onErrorChange);
  const [token, setToken] = useState("");
  const [widgetError, setWidgetError] = useState("");

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    onErrorChangeRef.current = onErrorChange;
  }, [onErrorChange]);

  const publishToken = useCallback((nextToken: string) => {
    setToken(nextToken);
    onTokenChangeRef.current?.(nextToken);
  }, []);

  const publishError = useCallback((nextError: string) => {
    setWidgetError(nextError);
    onErrorChangeRef.current?.(nextError);
  }, []);

  const renderWidget = useCallback((turnstile: TurnstileApi) => {
    if (!containerRef.current || widgetIdRef.current) return;

    if (!siteKey) return;

    try {
      apiRef.current = turnstile;
      widgetIdRef.current = turnstile.render(
        containerRef.current,
        createTurnstileOptions({
          siteKey: siteKey ?? "",
          onToken: publishToken,
          onError: publishError,
        }),
      );
    } catch {
      publishError("The security check could not start. Please reload and try again.");
    }
  }, [publishError, publishToken, siteKey]);

  useEffect(() => {
    if (!siteKey) return;
    const container = containerRef.current;
    publishError("");

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const stopWaiting = waitForTurnstileApi({
        readApi: () => (window as Window & { turnstile?: TurnstileApi }).turnstile,
        onReady: renderWidget,
        onTimeout: () => {
          publishError("The security check could not load. Check blockers or your network, then reload.");
        },
      });
      container?.setAttribute("data-turnstile-script-loaded", "true");
      return () => stopWaiting();
    };
    script.onerror = () => {
      publishToken("");
      publishError("The security check could not load. Check blockers or your network, then reload.");
    };
    document.body.appendChild(script);

    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId) {
        try {
          apiRef.current?.remove?.(widgetId);
        } catch {
          container?.replaceChildren();
        }
      }
      widgetIdRef.current = null;
      apiRef.current = null;
      onTokenChangeRef.current?.("");
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [publishError, publishToken, renderWidget, siteKey]);

  useEffect(() => {
    if (resetKey > 0 && apiRef.current && widgetIdRef.current) {
      publishToken("");
      publishError("");
      apiRef.current.reset(widgetIdRef.current);
    }
  }, [publishError, publishToken, resetKey]);

  if (!siteKey) {
    return (
      <p className="text-sm text-amber-200" role="alert">
        The security check is temporarily unavailable. Please try again later.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div ref={containerRef} className="cf-turnstile" />
      {!quiet && widgetError ? <p className="text-sm text-amber-200" role="alert">{widgetError}</p> : null}
      {!quiet ? <p className="text-xs text-zinc-500">Protected by Cloudflare Turnstile.</p> : null}
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
  const submissionInFlightRef = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInFlightRef.current) return;
    setError("");

    if (!turnstileToken) {
      setError("Complete the security check before submitting.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("cf-turnstile-response", turnstileToken);

    submissionInFlightRef.current = true;
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
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid min-w-0 gap-4">
      <input type="hidden" name="design_partner_interest" value={designPartner ? "true" : "false"} />
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>Name <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="name" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>Work email <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="work_email" type="email" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>Company <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="company" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">
        <span>Operational trust concern <span aria-hidden="true" className="text-cyan-300">*</span></span>
        <select required name="current_problem_category" defaultValue="" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
          <option value="" disabled>Select the closest concern</option>
          <option value="ai_identity">AI-agent governance and authorization</option>
          <option value="auditability">Replay continuity and Evidence Chain</option>
          <option value="human_review">Governance Review and escalation</option>
          <option value="session_integrity">Continuous Verification and Session Integrity</option>
          <option value="hiring_security">Hiring Security workflow</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>Requirements <span aria-hidden="true" className="text-cyan-300">*</span></span><textarea required name="message" rows={5} placeholder="Workflow, verification evidence, review or pilot requirements" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
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
