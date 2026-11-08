"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileFieldProps = {
  action?: "auth" | "password_reset" | "enterprise_access" | "waitlist";
  siteKey?: string | null;
  locale?: "en" | "es";
  onTokenChange?(token: string): void;
  onErrorChange?(message: string): void;
  quiet?: boolean;
  resetKey?: number;
};

export type TurnstileRenderOptions = {
  action: string;
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

function turnstileErrorMessage(errorCode?: string | number, locale: "en" | "es" = "en") {
  const code = String(errorCode ?? "");
  if (["110100", "110110", "400020", "400070"].includes(code)) {
    return locale === "es" ? "La comprobación de seguridad no está configurada correctamente. Contacta con soporte." : "The security check is not configured correctly. Please contact support.";
  }
  if (code === "110200") {
    return locale === "es" ? "Este sitio no está autorizado para usar la comprobación de seguridad. Contacta con soporte." : "The security check is not authorised for this site. Please contact support.";
  }
  if (code === "200500") {
    return locale === "es" ? "No se pudo conectar con la comprobación de seguridad. Revisa los bloqueadores o la red y vuelve a cargar la página." : "The security check could not connect. Check blockers or your network, then reload.";
  }
  return locale === "es" ? "La comprobación de seguridad ha fallado. Actualiza la página e inténtalo de nuevo." : "Security check failed. Please refresh the page and try again.";
}

export function shouldUsePreviewTurnstileFallback() {
  return false;
}

export function createTurnstileOptions(input: {
  action?: TurnstileFieldProps["action"];
  siteKey: string;
  locale?: "en" | "es";
  onToken(token: string): void;
  onError(message: string): void;
}): TurnstileRenderOptions {
  return {
    action: input.action ?? "auth",
    sitekey: input.siteKey,
    callback: (token) => {
      input.onError("");
      input.onToken(token);
    },
    "error-callback": (errorCode) => {
      input.onToken("");
      input.onError(turnstileErrorMessage(errorCode, input.locale));
      return true;
    },
    "expired-callback": () => {
      input.onToken("");
      input.onError(input.locale === "es" ? "La comprobación de seguridad ha caducado. Complétala de nuevo." : "The security check expired. Please complete it again.");
    },
    "timeout-callback": () => {
      input.onToken("");
      input.onError(input.locale === "es" ? "La comprobación de seguridad ha agotado el tiempo. Complétala de nuevo." : "The security check timed out. Please complete it again.");
    },
    "response-field": false,
    retry: "auto",
    "retry-interval": 2_000,
    "refresh-expired": "auto",
    "refresh-timeout": "auto",
    appearance: "interaction-only",
  };
}

export function TurnstileField({ siteKey, locale = "en", action = "auth", onTokenChange, onErrorChange, quiet = false, resetKey = 0 }: TurnstileFieldProps) {
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

  useEffect(() => {
    if (!siteKey) return;
    const container = containerRef.current;
    let active = true;
    let stopWaiting: (() => void) | undefined;
    publishError("");

    function renderWidget(turnstile: TurnstileApi) {
      if (!active || !containerRef.current || widgetIdRef.current) return;
      try {
        apiRef.current = turnstile;
        widgetIdRef.current = turnstile.render(
          containerRef.current,
          createTurnstileOptions({
            siteKey: siteKey ?? "",
            locale,
            action,
            onToken: (token) => { if (active) publishToken(token); },
            onError: (error) => { if (active) publishError(error); },
          }),
        );
      } catch {
        if (active) publishError(locale === "es" ? "No se pudo iniciar la comprobación de seguridad. Vuelve a cargar la página." : "The security check could not start. Please reload and try again.");
      }
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!active) return;
      stopWaiting = waitForTurnstileApi({
        readApi: () => (window as Window & { turnstile?: TurnstileApi }).turnstile,
        onReady: renderWidget,
        onTimeout: () => {
          if (active) publishError(locale === "es" ? "No se pudo cargar la comprobación de seguridad. Revisa los bloqueadores o la red y vuelve a cargar la página." : "The security check could not load. Check blockers or your network, then reload.");
        },
      });
      container?.setAttribute("data-turnstile-script-loaded", "true");
    };
    script.onerror = () => {
      if (!active) return;
      publishToken("");
      publishError(locale === "es" ? "No se pudo cargar la comprobación de seguridad. Revisa los bloqueadores o la red y vuelve a cargar la página." : "The security check could not load. Check blockers or your network, then reload.");
    };
    document.body.appendChild(script);

    return () => {
      active = false;
      stopWaiting?.();
      script.onload = null;
      script.onerror = null;
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
  }, [action, locale, publishError, publishToken, siteKey]);

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
        {locale === "es" ? "La comprobación de seguridad no está disponible temporalmente. Inténtalo más tarde." : "The security check is temporarily unavailable. Please try again later."}
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div ref={containerRef} className="cf-turnstile" />
      {!quiet && widgetError ? <p className="text-sm text-amber-200" role="alert">{widgetError}</p> : null}
      {!quiet ? <p className="text-xs text-zinc-500">{locale === "es" ? "Protegido por Cloudflare Turnstile." : "Protected by Cloudflare Turnstile."}</p> : null}
    </div>
  );
}

type EnterpriseAccessFormProps = {
  buttonLabel: string;
  designPartner: boolean;
  locale?: "en" | "es";
};

export function EnterpriseAccessForm({ buttonLabel, designPartner, locale = "en" }: EnterpriseAccessFormProps) {
  const isSpanish = locale === "es";
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
      setError(isSpanish ? "Completa la comprobación de seguridad antes de enviar el formulario." : "Complete the security check before submitting.");
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
        setError(isSpanish ? "No pudimos enviar tu solicitud. Revisa los datos e inténtalo de nuevo." : "We could not submit your request. Please try again.");
        setTurnstileToken("");
        setResetKey((value) => value + 1);
        return;
      }

      window.location.assign(
        isSpanish ? "/es/enterprise-access?success=true" : response.redirected ? response.url : "/enterprise-access?success=true",
      );
    } catch {
      setError(isSpanish ? "No pudimos enviar tu solicitud. Inténtalo de nuevo." : "We could not submit your request. Please try again.");
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
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>{isSpanish ? "Nombre" : "Name"} <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="name" autoComplete="name" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>{isSpanish ? "Correo electrónico de trabajo" : "Work email"} <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="work_email" type="email" autoComplete="email" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>{isSpanish ? "Empresa" : "Company"} <span aria-hidden="true" className="text-cyan-300">*</span></span><input required name="company" autoComplete="organization" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <label className="grid gap-2 text-sm text-zinc-300">
        <span>{isSpanish ? "Necesidad de confianza operativa" : "Operational trust concern"} <span aria-hidden="true" className="text-cyan-300">*</span></span>
        <select required name="current_problem_category" defaultValue="" className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white">
          <option value="" disabled>{isSpanish ? "Selecciona la necesidad más cercana" : "Select the closest concern"}</option>
          <option value="ai_identity">{isSpanish ? "Gobernanza y autorización de agentes de IA" : "AI-agent governance and authorization"}</option>
          <option value="auditability">{isSpanish ? "Continuidad de Replay y cadena de evidencias" : "Replay continuity and Evidence Chain"}</option>
          <option value="human_review">{isSpanish ? "Revisión y escalado de gobernanza" : "Governance Review and escalation"}</option>
          <option value="session_integrity">{isSpanish ? "Verificación continua e integridad de sesión" : "Continuous Verification and Session Integrity"}</option>
          <option value="hiring_security">{isSpanish ? "Flujo de seguridad en contratación" : "Hiring Security workflow"}</option>
          <option value="other">{isSpanish ? "Otro" : "Other"}</option>
        </select>
      </label>
      <label className="grid min-w-0 gap-2 text-sm text-zinc-300"><span>{isSpanish ? "Requisitos" : "Requirements"} <span aria-hidden="true" className="text-cyan-300">*</span></span><textarea required name="message" rows={5} placeholder={isSpanish ? "Flujo de trabajo, pruebas de verificación, revisión o requisitos del piloto" : "Workflow, verification evidence, review or pilot requirements"} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-white" /></label>
      <TurnstileField
        action="enterprise_access"
        siteKey={siteKey}
        locale={locale}
        onTokenChange={setTurnstileToken}
        resetKey={resetKey}
      />
      {error ? <p role="alert" aria-live="polite" className="text-sm text-amber-200">{error}</p> : null}
      <button
        type="submit"
        disabled={!turnstileToken || submitting}
        className="brand-primary-action w-full p-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? isSpanish ? "Enviando…" : "Submitting..." : buttonLabel}
      </button>
    </form>
  );
}
