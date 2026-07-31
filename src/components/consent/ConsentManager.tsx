"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  choicesForConsentAction,
  consentDecisionState,
  consentRetryDelayRemainingMs,
  consentSavedToastSessionPrefix,
  consentSyncMaximumAttempts,
  createLocalConsentReceipt,
  effectiveConsentChoices,
  localConsentCookieName,
  localConsentCookieValue,
  markConsentPersisted,
  markConsentSyncAttempt,
  markConsentSyncFailure,
  markConsentSyncRejected,
  readLocalConsentReceipt,
  writeLocalConsentReceipt,
  type ConsentDecisionState,
  type ConsentReceiptSyncStatus,
  type LocalConsentReceipt,
} from "@/src/lib/consent/local-state";
import { applyConsentState } from "@/src/lib/consent/tracker-loader";
import { consentDefaults, currentConsentPolicy } from "@/src/lib/consent/policy";
import type { ConsentAction, ConsentChoices } from "@/src/lib/consent/types";
import { ConsentBanner } from "./ConsentBanner";
import { ConsentPreferences } from "./ConsentPreferences";
import { ConsentStatus } from "./ConsentStatus";

const receiptUpdatedEvent = "cs:consent-receipt-updated";
const retryReceiptEvent = "cs:retry-consent-receipt";
const savedToastDurationMs = 5_000;
const hiddenManagerPaths = ["/privacy/preferences", "/privacy/consent-history"];
const inMemorySavedToasts = new Set<string>();
const strictConsentChoices = consentDefaults("GLOBAL_DEFAULT");

class ConsentSyncRejectedError extends Error {}

function persistBrowserReceipt(receipt: LocalConsentReceipt) {
  writeLocalConsentReceipt(window.localStorage, receipt);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((Date.parse(receipt.expiresAt) - Date.now()) / 1000));
  document.cookie = `${localConsentCookieName}=${localConsentCookieValue(receipt)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function announceReceiptUpdate(receipt: LocalConsentReceipt) {
  window.dispatchEvent(new CustomEvent<LocalConsentReceipt>(receiptUpdatedEvent, { detail: receipt }));
}

function claimSavedToast(receiptId: string) {
  const key = `${consentSavedToastSessionPrefix}${receiptId}`;
  if (inMemorySavedToasts.has(key)) return false;
  try {
    if (window.sessionStorage.getItem(key)) {
      inMemorySavedToasts.add(key);
      return false;
    }
    window.sessionStorage.setItem(key, "1");
  } catch {
    // The module-level set still deduplicates when sessionStorage is unavailable.
  }
  inMemorySavedToasts.add(key);
  return true;
}

function consentSyncErrorCategory(error: unknown) {
  if (error instanceof ConsentSyncRejectedError) return "permanent_rejection";
  if (error instanceof TypeError) return "network";
  if (error instanceof Error && error.message === "invalid_response") return "invalid_response";
  return "server_unavailable";
}

function logConsentSyncFailure(error: unknown, receipt: LocalConsentReceipt) {
  console.warn("Cookie consent persistence attempt failed.", {
    eventType: "consent.receipt.sync_failed",
    timestamp: new Date().toISOString(),
    route: window.location.pathname,
    operation: "cookie_consent_receipt_persist",
    retryCount: receipt.retryCount,
    errorCategory: consentSyncErrorCategory(error),
    finalOutcome: receipt.status,
  });
}

function cookieRequest(receipt: LocalConsentReceipt) {
  return {
    consentVersion: receipt.consentVersion,
    anonymousId: receipt.anonymousId,
    choices: {
      necessary: true as const,
      analytics: receipt.choices.analytics,
      marketing: receipt.choices.marketing,
      preferences: receipt.choices.functional,
      aiImprovements: receipt.choices.ai_improvements,
    },
    source: receipt.source,
    idempotencyKey: receipt.idempotencyKey,
    action: receipt.action,
  };
}

export function ConsentManager({ preferencePage = false }: { preferencePage?: boolean }) {
  const pathname = usePathname();
  const [choices, setChoices] = useState<ConsentChoices>(strictConsentChoices);
  const [ready, setReady] = useState(false);
  const [decisionState, setDecisionState] = useState<ConsentDecisionState>("undecided");
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ConsentReceiptSyncStatus>("idle");
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [managing, setManaging] = useState(preferencePage);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<LocalConsentReceipt | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const preferenceDialog = useRef<HTMLDivElement>(null);
  const preferenceReturnFocus = useRef<HTMLElement | null>(null);

  const showSavedToastOnce = useCallback((receiptId: string) => {
    if (!claimSavedToast(receiptId)) return;
    if (preferencePage || hiddenManagerPaths.includes(pathname)) return;
    setSavedToast(receiptId);
  }, [pathname, preferencePage]);

  const acceptReceiptState = useCallback((receipt: LocalConsentReceipt) => {
    receiptRef.current = receipt;
    setChoices(receipt.choices);
    setDecisionState(consentDecisionState(receipt));
    setSyncStatus(receipt.status);
    setSaving(false);
    applyConsentState(effectiveConsentChoices(receipt));
  }, []);

  const syncReceipt = useCallback(async (receipt: LocalConsentReceipt, manual = false) => {
    if (receipt.status === "synced") return;
    if (!manual && (receipt.status === "failed_terminal" || receipt.retryCount >= consentSyncMaximumAttempts)) return;

    const attempted = markConsentSyncAttempt(receipt);
    receiptRef.current = attempted;
    setSyncStatus("syncing");
    try {
      persistBrowserReceipt(attempted);
      announceReceiptUpdate(attempted);
      const response = await fetch("/api/consent/cookies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cookieRequest(attempted)),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; status?: string; receiptId?: string; reasonCode?: string } | null;
      if (!response.ok || body?.success !== true || body.status !== "persisted" || !body.receiptId) {
        if (response.status >= 400 && response.status < 500 && body?.status === "rejected") {
          throw new ConsentSyncRejectedError("consent_receipt_rejected");
        }
        throw new Error("invalid_response");
      }
      const synced = markConsentPersisted(attempted, body.receiptId);
      persistBrowserReceipt(synced);
      acceptReceiptState(synced);
      announceReceiptUpdate(synced);
      setError(null);
    } catch (error) {
      // Local consent dismisses the prompt, but optional technologies stay denied
      // until the server confirms a durable receipt.
      const rejected = error instanceof ConsentSyncRejectedError;
      const failed = rejected ? markConsentSyncRejected(attempted) : markConsentSyncFailure(attempted);
      receiptRef.current = failed;
      setSyncStatus(failed.status);
      applyConsentState(strictConsentChoices);
      try {
        persistBrowserReceipt(failed);
        announceReceiptUpdate(failed);
      } catch {
        // The original local choice remains in place if a later metadata write fails.
      }
      logConsentSyncFailure(error, failed);
      setError(rejected ? "The server rejected this receipt. Review your privacy choice and try again." : null);
    }
  }, [acceptReceiptState]);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    applyConsentState(strictConsentChoices, true);
    let local: ReturnType<typeof readLocalConsentReceipt>;
    try {
      local = readLocalConsentReceipt(window.localStorage, currentConsentPolicy.version);
    } catch {
      setError("Your browser could not store this preference. Check storage settings and try again.");
      setDecisionState("undecided");
      setReady(true);
      return;
    }

    if (local.state === "valid" && local.receipt) {
      acceptReceiptState(local.receipt);
    } else {
      setDecisionState("undecided");
    }
    setReady(true);
  }, [acceptReceiptState]);

  useEffect(() => {
    function receiptUpdated(event: Event) {
      const receipt = (event as CustomEvent<LocalConsentReceipt>).detail;
      if (!receipt || receipt.consentVersion !== currentConsentPolicy.version) return;
      acceptReceiptState(receipt);
      if (receipt.status === "idle") showSavedToastOnce(receipt.receiptId);
    }
    function retryRequested() {
      if (preferencePage || !receiptRef.current) return;
      void syncReceipt(receiptRef.current, true);
    }
    window.addEventListener(receiptUpdatedEvent, receiptUpdated);
    window.addEventListener(retryReceiptEvent, retryRequested);
    return () => {
      window.removeEventListener(receiptUpdatedEvent, receiptUpdated);
      window.removeEventListener(retryReceiptEvent, retryRequested);
    };
  }, [acceptReceiptState, preferencePage, showSavedToastOnce, syncReceipt]);

  useEffect(() => {
    if (preferencePage || !ready) return;
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    const receipt = receiptRef.current;
    if (!receipt || !["idle", "retry_scheduled"].includes(receipt.status)) return;
    const delay = consentRetryDelayRemainingMs(receipt);
    if (delay === null) return;
    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      if (receiptRef.current) void syncReceipt(receiptRef.current);
    }, delay);
    return () => {
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    };
  }, [preferencePage, ready, syncReceipt, syncStatus]);

  useEffect(() => {
    if (!savedToast) return;
    const timer = window.setTimeout(() => setSavedToast(null), savedToastDurationMs);
    return () => window.clearTimeout(timer);
  }, [savedToast]);

  useEffect(() => {
    function openPreferences() {
      setError(null);
      setManaging(true);
    }
    window.addEventListener("cs:open-consent-preferences", openPreferences);
    return () => window.removeEventListener("cs:open-consent-preferences", openPreferences);
  }, []);

  useEffect(() => {
    if (!managing || preferencePage) return;
    preferenceReturnFocus.current = document.activeElement as HTMLElement;
    const root = preferenceDialog.current;
    root?.querySelector<HTMLElement>("button,input")?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    function keydown(event: KeyboardEvent) {
      if (!root) return;
      if (event.key === "Escape") { event.preventDefault(); setManaging(false); return; }
      if (event.key !== "Tab") return;
      const items = [...root.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),a[href]")];
      const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      preferenceReturnFocus.current?.focus();
    };
  }, [managing, preferencePage]);

  function persist(action: ConsentAction) {
    setSaving(true);
    setError(null);
    const nextChoices = choicesForConsentAction(action, choices);
    const receipt = createLocalConsentReceipt({
      action,
      choices: nextChoices,
      consentVersion: currentConsentPolicy.version,
      source: preferencePage || managing ? "cookie_preferences" : "cookie_banner",
      anonymousId: receiptRef.current?.anonymousId,
      expiresAfterDays: currentConsentPolicy.expiresAfterDays,
    });
    try {
      persistBrowserReceipt(receipt);
    } catch {
      setError("Your browser could not store this preference. Check storage settings and try again.");
      setSaving(false);
      return;
    }
    receiptRef.current = receipt;
    setChoices(nextChoices);
    setDecisionState(consentDecisionState(receipt));
    setSyncStatus("idle");
    setManaging(preferencePage);
    setSaving(false);
    applyConsentState(strictConsentChoices);
    showSavedToastOnce(receipt.receiptId);
    announceReceiptUpdate(receipt);
    void syncReceipt(receipt);
  }

  function retrySync() {
    if (!receiptRef.current) return;
    if (preferencePage) window.dispatchEvent(new Event(retryReceiptEvent));
    else void syncReceipt(receiptRef.current, true);
  }

  const status = <ConsentStatus choices={effectiveConsentChoices(receiptRef.current)} receiptStatus={syncStatus} canRetry={Boolean(receiptRef.current && !["synced", "rejected"].includes(syncStatus))} retrying={syncStatus === "syncing"} onRetry={retrySync}/>;
  const showConsentBanner = ready && decisionState === "undecided";

  if (!ready && !preferencePage) return null;
  if (preferencePage) return <div className="grid gap-6" data-state={syncStatus}>{status}<ConsentPreferences policy={currentConsentPolicy} choices={choices} busy={saving} error={error} onChange={setChoices} onSave={() => persist("SAVE_PREFERENCES")} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onCancel={() => history.back()}/><button type="button" className="justify-self-start text-sm text-red-300 underline" onClick={() => persist("WITHDRAW")}>Withdraw optional consent</button></div>;
  if (hiddenManagerPaths.includes(pathname)) return null;
  if (managing) return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
      role="presentation"
      data-state={syncStatus}
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setManaging(false);
      }}
    >
      <div
        ref={preferenceDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-preferences-heading"
        aria-describedby="consent-preferences-description"
        className="relative my-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--brand-border-strong)] bg-[var(--brand-surface)] text-white shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close cookie preferences"
          className="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-950 text-xl leading-none text-zinc-100 shadow-md hover:border-cyan-400 hover:text-white sm:right-4 sm:top-4"
          onClick={() => setManaging(false)}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="overscroll-contain overflow-y-auto p-4 sm:p-6">
          {status}
          <div className="mt-5">
            <ConsentPreferences policy={currentConsentPolicy} choices={choices} busy={saving} error={error} onChange={setChoices} onSave={() => persist("SAVE_PREFERENCES")} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onCancel={() => setManaging(false)}/>
          </div>
        </div>
      </div>
    </div>
  );
  if (showConsentBanner) return <ConsentBanner state={saving ? "saving" : "open"} error={error} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onManage={() => setManaging(true)}/>;
  if (savedToast) return <aside data-notice="preferences-saved" className="pointer-events-none fixed bottom-4 right-4 z-[90] max-w-sm rounded-xl border border-cyan-900 bg-[#071018] p-4 text-sm text-cyan-50 shadow-xl" role="status" aria-live="polite"><p>{syncStatus === "synced" ? "Privacy choice saved and receipt persisted." : syncStatus === "failed_terminal" ? "Privacy choice stored locally. Receipt persistence is temporarily unavailable." : syncStatus === "rejected" ? "Privacy choice stored locally, but the server rejected its receipt." : "Privacy choice stored locally. Receipt synchronisation is pending."}</p><button type="button" className="pointer-events-auto mt-3 min-h-11 rounded px-2 font-semibold underline" onClick={() => setSavedToast(null)} aria-label="Dismiss saved preferences notification">Dismiss</button></aside>;
  return <span hidden data-state={syncStatus} />;
}
