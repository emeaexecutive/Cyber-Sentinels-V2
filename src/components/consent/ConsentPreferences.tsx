"use client";

import { ConsentCategory } from "./ConsentCategory";
import type { ConsentChoices, ConsentPolicy } from "@/src/lib/consent/types";

const primary = "min-h-11 rounded-lg border border-cyan-700 bg-cyan-950/40 px-4 py-2.5 text-sm font-semibold text-cyan-50 hover:bg-cyan-900/50";
const secondary = "min-h-11 rounded-lg border border-zinc-700 bg-black px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-500";

export function ConsentPreferences({ policy, choices, busy, error, onChange, onSave, onAcceptAll, onRejectOptional, onCancel }: { policy: ConsentPolicy; choices: ConsentChoices; busy: boolean; error?: string | null; onChange: (choices: ConsentChoices) => void; onSave: () => void; onAcceptAll: () => void; onRejectOptional: () => void; onCancel: () => void }) {
  return (
    <div className="grid gap-4">
      <div><p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Enterprise Trust Consent Manager™</p><h2 className="mt-2 text-2xl font-semibold text-white">Trust Preferences</h2><p className="mt-2 text-sm text-zinc-400">Policy {policy.version}. Optional categories remain off unless you enable them.</p></div>
      {policy.categories.map((category) => <ConsentCategory key={category.key} category={category} enabled={choices[category.key]} onChange={(enabled) => onChange({ ...choices, [category.key]: category.required ? true : enabled })} />)}
      {error ? <p role="alert" className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" disabled={busy} onClick={onSave} className={primary}>Save Preferences</button><button type="button" disabled={busy} onClick={onAcceptAll} className={secondary}>Accept All</button>
        <button type="button" disabled={busy} onClick={onRejectOptional} className={secondary}>Reject Optional</button><button type="button" disabled={busy} onClick={onCancel} className={secondary}>Cancel</button>
      </div>
    </div>
  );
}
