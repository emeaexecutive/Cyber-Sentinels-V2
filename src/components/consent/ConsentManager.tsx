"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  choicesForConsentAction,
  consentRetryIsDue,
  createLocalConsentReceipt,
  effectiveConsentChoices,
  localConsentCookieName,
  localConsentCookieValue,
  markConsentPersisted,
  markConsentSyncAttempt,
  readLocalConsentReceipt,
  writeLocalConsentReceipt,
  type LocalConsentReceipt,
} from "@/src/lib/consent/local-state";
import { applyConsentState } from "@/src/lib/consent/tracker-loader";
import { consentDefaults, currentConsentPolicy } from "@/src/lib/consent/policy";
import type { ConsentAction, ConsentChoices } from "@/src/lib/consent/types";
import { ConsentBanner } from "./ConsentBanner";
import { ConsentPreferences } from "./ConsentPreferences";
import { ConsentStatus } from "./ConsentStatus";

type ConsentUiState = "open" | "saving" | "closed" | "retryable";

function persistBrowserReceipt(receipt: LocalConsentReceipt) {
  writeLocalConsentReceipt(window.localStorage, receipt);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((Date.parse(receipt.expiresAt) - Date.now()) / 1000));
  document.cookie = `${localConsentCookieName}=${localConsentCookieValue(receipt)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
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
  const strictChoices = consentDefaults("GLOBAL_DEFAULT");
  const [choices, setChoices] = useState<ConsentChoices>(strictChoices);
  const [ready, setReady] = useState(false);
  const [uiState, setUiState] = useState<ConsentUiState>("closed");
  const [managing, setManaging] = useState(preferencePage);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<LocalConsentReceipt | null>(null);
  const automaticRetryStarted = useRef(false);
  const preferenceDialog = useRef<HTMLDivElement>(null);
  const preferenceReturnFocus = useRef<HTMLElement | null>(null);

  const syncReceipt = useCallback(async (receipt: LocalConsentReceipt, manual = false) => {
    if (!manual && receipt.status === "persisted") return;
    const attempted = markConsentSyncAttempt(receipt);
    receiptRef.current = attempted;
    try {
      persistBrowserReceipt(attempted);
      const response = await fetch("/api/consent/cookies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cookieRequest(attempted)),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; status?: string; receiptId?: string } | null;
      if (!response.ok || body?.success !== true || body.status !== "persisted" || !body.receiptId) {
        throw new Error("Consent receipt synchronization is temporarily unavailable.");
      }
      const persisted = markConsentPersisted(attempted, body.receiptId);
      receiptRef.current = persisted;
      persistBrowserReceipt(persisted);
      setChoices(persisted.choices);
      applyConsentState(persisted.choices);
      setUiState("closed");
      setError(null);
    } catch {
      // The browser choice remains authoritative for dismissing the notice, but
      // optional technologies remain denied until the server receipt exists.
      applyConsentState(consentDefaults("GLOBAL_DEFAULT"));
      setUiState("retryable");
      setError(null);
    }
  }, []);

  useEffect(() => {
    applyConsentState(consentDefaults("GLOBAL_DEFAULT"), true);
    let local: ReturnType<typeof readLocalConsentReceipt>;
    try {
      local = readLocalConsentReceipt(window.localStorage, currentConsentPolicy.version);
    } catch {
      setError("Your browser could not store this preference. Check storage settings and try again.");
      setUiState("open");
      setReady(true);
      return;
    }

    if (local.state === "valid" && local.receipt) {
      receiptRef.current = local.receipt;
      setChoices(local.receipt.choices);
      applyConsentState(effectiveConsentChoices(local.receipt));
      setUiState(local.receipt.status === "pending_sync" ? "retryable" : "closed");
      if (!automaticRetryStarted.current && consentRetryIsDue(local.receipt)) {
        automaticRetryStarted.current = true;
        void syncReceipt(local.receipt);
      }
    } else {
      setUiState("open");
    }
    setReady(true);
  }, [syncReceipt]);

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
    return () => { document.removeEventListener("keydown", keydown); preferenceReturnFocus.current?.focus(); };
  }, [managing, preferencePage]);

  function persist(action: ConsentAction) {
    setUiState("saving");
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
      setUiState("open");
      return;
    }
    receiptRef.current = receipt;
    setChoices(nextChoices);
    setManaging(preferencePage);
    setUiState("closed");
    applyConsentState(consentDefaults("GLOBAL_DEFAULT"));
    void syncReceipt(receipt);
  }

  function retrySync() {
    if (receiptRef.current) void syncReceipt(receiptRef.current, true);
  }

  if (!ready && !preferencePage) return null;
  if (preferencePage) return <div className="grid gap-6" data-state={uiState}><ConsentStatus choices={effectiveConsentChoices(receiptRef.current)}/><ConsentPreferences policy={currentConsentPolicy} choices={choices} busy={uiState === "saving"} error={error} onChange={setChoices} onSave={() => persist("SAVE_PREFERENCES")} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onCancel={() => history.back()}/><button type="button" className="justify-self-start text-sm text-red-300 underline" onClick={() => persist("WITHDRAW")}>Withdraw optional consent</button></div>;
  if (["/privacy/preferences", "/privacy/consent-history"].includes(pathname)) return null;
  if (managing) return <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-3 sm:p-8" role="presentation" data-state={uiState}><div ref={preferenceDialog} role="dialog" aria-modal="true" aria-label="Trust Preferences" className="mx-auto max-w-4xl rounded-2xl border border-zinc-800 bg-[#070b11] p-5 sm:p-7"><ConsentPreferences policy={currentConsentPolicy} choices={choices} busy={uiState === "saving"} error={error} onChange={setChoices} onSave={() => persist("SAVE_PREFERENCES")} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onCancel={() => setManaging(false)}/></div></div>;
  if (uiState === "open" || uiState === "saving") return <ConsentBanner state={uiState} error={error} onAcceptAll={() => persist("ACCEPT_ALL")} onRejectOptional={() => persist("REJECT_OPTIONAL")} onManage={() => setManaging(true)}/>;
  if (uiState === "retryable") return <aside data-state="retryable" className="fixed bottom-4 right-4 z-[90] max-w-sm rounded-xl border border-amber-800 bg-[#100d06] p-4 text-sm text-amber-100 shadow-xl" aria-live="polite"><p>Your privacy choice is saved in this browser. Optional tracking remains off while its receipt waits to sync.</p><button type="button" className="mt-3 font-semibold underline" onClick={retrySync}>Retry receipt sync</button></aside>;
  return <span hidden data-state="closed" />;
}
