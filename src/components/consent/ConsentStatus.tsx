import type { ConsentReceiptSyncStatus } from "@/src/lib/consent/local-state";
import { privacyLevel } from "@/src/lib/consent/policy";
import { consentCategoryKeys, type ConsentChoices } from "@/src/lib/consent/types";

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
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-lg font-semibold text-white">Privacy status</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {consentCategoryKeys.map((key) => <p key={key} className="text-sm text-zinc-300"><span className="text-zinc-500">{labels[key]}:</span> {choices[key] ? "Enabled" : "Disabled"}</p>)}
        <p className="text-sm text-zinc-300"><span className="text-zinc-500">Privacy Level:</span> {privacyLevel(choices)}</p>
        <p className="text-sm text-zinc-300"><span className="text-zinc-500">Receipt status:</span> {receiptStatusLabels[receiptStatus]}</p>
      </div>
      {canRetry ? <button type="button" disabled={retrying} className="mt-4 min-h-11 rounded-lg border border-amber-800 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-950/30 disabled:cursor-wait disabled:opacity-60" onClick={onRetry}>{retrying ? "Retrying receipt sync…" : "Retry receipt sync"}</button> : null}
      <p className="mt-3 text-xs text-zinc-500">Informational only—not a legal or security score or guarantee.</p>
    </section>
  );
}
