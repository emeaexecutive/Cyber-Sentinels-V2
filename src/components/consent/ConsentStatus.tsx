"use client";

import type { ConsentReceiptSyncStatus } from "@/src/lib/consent/local-state";
import { privacyLevel } from "@/src/lib/consent/policy";
import { consentCategoryKeys, type ConsentChoices } from "@/src/lib/consent/types";
import { consentText, useConsentLocale } from "@/src/lib/consent/localization";

const labels = { essential: "Essential Security", functional: "Functional", analytics: "Analytics", ai_improvements: "AI Improvements", marketing: "Marketing" };
const receiptStatusLabels: Record<ConsentReceiptSyncStatus, string> = {
  idle: "Stored locally; receipt pending",
  syncing: "Receipt synchronising",
  synced: "Saved and persisted",
  retry_scheduled: "Stored locally; retry scheduled",
  failed_terminal: "Stored locally; persistence temporarily unavailable",
  rejected: "Stored locally; receipt rejected",
};

export function ConsentStatus({ choices, receiptStatus, canRetry, retrying, onRetry }: {
  choices: ConsentChoices;
  receiptStatus: ConsentReceiptSyncStatus;
  canRetry: boolean;
  retrying: boolean;
  onRetry: () => void;
}) {
  const locale = useConsentLocale();
  const localizedLabels = { essential: consentText(locale, "essentialSecurity", labels.essential), functional: consentText(locale, "functional", labels.functional), analytics: consentText(locale, "analytics", labels.analytics), ai_improvements: consentText(locale, "aiImprovements", labels.ai_improvements), marketing: consentText(locale, "marketing", labels.marketing) };
  const localizedReceiptStatus = locale === "es" ? {
    idle: "Guardado localmente; recibo pendiente",
    syncing: "Sincronizando el recibo",
    synced: "Guardado y conservado",
    retry_scheduled: "Guardado localmente; reintento programado",
    failed_terminal: "Guardado localmente; conservación temporalmente no disponible",
    rejected: "Guardado localmente; recibo rechazado",
  } : receiptStatusLabels;
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-lg font-semibold text-white">{consentText(locale, "privacyStatus", "Privacy status")}</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {consentCategoryKeys.map((key) => <p key={key} className="text-sm text-zinc-300"><span className="text-zinc-500">{localizedLabels[key]}:</span> {choices[key] ? consentText(locale, "enabled", "Enabled") : consentText(locale, "disabled", "Disabled")}</p>)}
        <p className="text-sm text-zinc-300"><span className="text-zinc-500">{consentText(locale, "privacyLevel", "Privacy Level")}:</span> {locale === "es" ? consentText(locale, privacyLevel(choices).toLowerCase() as "high" | "broad" | "custom", privacyLevel(choices)) : privacyLevel(choices)}</p>
        <p className="text-sm text-zinc-300">{locale === "es" ? <span className="text-zinc-500">Estado del recibo:</span> : <span className="text-zinc-500">Receipt status:</span>} {localizedReceiptStatus[receiptStatus]}</p>
      </div>
      {canRetry ? <button type="button" disabled={retrying} className="mt-4 min-h-11 rounded-lg border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950/30 disabled:cursor-wait disabled:opacity-60" onClick={onRetry}>{retrying ? consentText(locale, "retrying", "Retrying receipt sync…") : consentText(locale, "retry", "Retry receipt sync")}</button> : null}
      <p className="mt-3 text-xs text-zinc-500">{consentText(locale, "informational", "Informational only—not a legal or security score or guarantee.")}</p>
    </section>
  );
}
