"use client";

import { useEffect, useRef } from "react";

const equalAction = "min-h-12 w-full rounded-lg border border-cyan-700 bg-cyan-950/50 px-5 py-3 text-sm font-semibold text-cyan-50 hover:bg-cyan-900/60 sm:w-auto";

export function ConsentBanner({ state, error, onAcceptAll, onRejectOptional, onManage }: { state: "open" | "saving"; error?: string | null; onAcceptAll: () => void; onRejectOptional: () => void; onManage: () => void }) {
  const busy = state === "saving";
  const dialog = useRef<HTMLDivElement>(null); const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement; const root = dialog.current; const first = root?.querySelector<HTMLElement>("button"); first?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); return; }
      if (event.key !== "Tab" || !root) return; const items = [...root.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input:not(:disabled)")]; if (!items.length) return; const firstItem = items[0]; const lastItem = items.at(-1)!; if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); } else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    }
    document.addEventListener("keydown", keydown); return () => { document.removeEventListener("keydown", keydown); returnFocus.current?.focus(); };
  }, []);
  return (
    <div className="fixed inset-0 z-[100] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center" role="presentation" data-state={state}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="consent-heading" aria-describedby="consent-description" className="w-full max-w-3xl rounded-2xl border border-cyan-900 bg-[#070b11] p-5 shadow-2xl sm:p-7">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Trust Preferences</p><h2 id="consent-heading" className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Your Privacy. Your Trust.</h2>
        <p id="consent-description" className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Cyber Sentinels uses essential technologies to secure your account and optional technologies to improve your experience. You remain in control.</p>
        <p className="mt-2 text-xs text-zinc-500">Escape does not dismiss this first-choice notice; choose an option or open preferences.</p>
        {error ? <p role="alert" className="mt-3 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-200">{error}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-3"><button type="button" disabled={busy} onClick={onAcceptAll} className={equalAction}>Accept All</button><button type="button" disabled={busy} onClick={onRejectOptional} className={equalAction}>Reject Optional</button><button type="button" disabled={busy} onClick={onManage} className="min-h-12 w-full rounded-lg border border-zinc-600 bg-black px-5 py-3 text-sm font-semibold text-white hover:border-zinc-400 sm:w-auto">Manage Preferences</button></div>
      </div>
    </div>
  );
}
