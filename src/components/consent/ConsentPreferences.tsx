"use client";

import { ConsentCategory } from "./ConsentCategory";
import type { ConsentChoices, ConsentPolicy } from "@/src/lib/consent/types";
import { consentText, useConsentLocale } from "@/src/lib/consent/localization";

const primary = "min-h-11 w-full rounded-lg border border-cyan-400 bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60";
const secondary = "min-h-11 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-400 hover:bg-zinc-900 disabled:cursor-wait disabled:opacity-60";

export function ConsentPreferences({ policy, choices, busy, error, onChange, onSave, onAcceptAll, onRejectOptional, onCancel }: { policy: ConsentPolicy; choices: ConsentChoices; busy: boolean; error?: string | null; onChange: (choices: ConsentChoices) => void; onSave: () => void; onAcceptAll: () => void; onRejectOptional: () => void; onCancel: () => void }) {
  const locale = useConsentLocale();
  return (
    <div className="grid gap-4">
      <div className="pr-11"><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Enterprise Trust Consent Manager™</p><h2 id="consent-preferences-heading" className="mt-2 text-2xl font-semibold text-white">{consentText(locale, "trustPreferences", "Trust Preferences")}</h2><p id="consent-preferences-description" className="mt-2 text-sm text-zinc-300">{consentText(locale, "policy", "Policy")} {policy.version}. {consentText(locale, "optionalOff", "Optional categories remain off unless you enable them.")}</p></div>
      {policy.categories.map((category) => <ConsentCategory key={category.key} category={category} enabled={choices[category.key]} onChange={(enabled) => onChange({ ...choices, [category.key]: category.required ? true : enabled })} />)}
      {error ? <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" disabled={busy} onClick={onSave} className={primary}>{consentText(locale, "savePreferences", "Save Preferences")}</button><button type="button" disabled={busy} onClick={onAcceptAll} className={secondary}>{consentText(locale, "acceptAll", "Accept All")}</button>
        <button type="button" disabled={busy} onClick={onRejectOptional} className={secondary}>{consentText(locale, "rejectOptional", "Reject Optional")}</button><button type="button" disabled={busy} onClick={onCancel} className={secondary}>{consentText(locale, "cancel", "Cancel")}</button>
      </div>
    </div>
  );
}
