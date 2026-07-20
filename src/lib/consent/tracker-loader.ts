"use client";

import { updateGoogleConsentMode } from "./google-consent.ts";
import type { ConsentCategoryKey, ConsentChoices } from "./types.ts";

type TrackerRegistration = { id: string; category: Exclude<ConsentCategoryKey, "essential">; load: () => void | (() => void); cleanup?: () => void };
const registry = new Map<string, TrackerRegistration>();
let effective: ConsentChoices = { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false };

export function registerConsentTracker(registration: Omit<TrackerRegistration, "cleanup">) {
  if (registry.has(registration.id)) return () => unregisterConsentTracker(registration.id);
  registry.set(registration.id, { ...registration });
  reconcileTracker(registration.id);
  return () => unregisterConsentTracker(registration.id);
}

function reconcileTracker(id: string) {
  const tracker = registry.get(id);
  if (!tracker) return;
  if (effective[tracker.category] && !tracker.cleanup) tracker.cleanup = tracker.load() || (() => undefined);
  if (!effective[tracker.category] && tracker.cleanup) { tracker.cleanup(); tracker.cleanup = undefined; }
}

export function applyConsentState(choices: ConsentChoices, initial = false) {
  effective = { ...choices, essential: true };
  updateGoogleConsentMode(effective, initial ? "default" : "update");
  for (const id of registry.keys()) reconcileTracker(id);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("cs:consent-changed", { detail: effective }));
}

export function unregisterConsentTracker(id: string) {
  const tracker = registry.get(id); tracker?.cleanup?.(); registry.delete(id);
}

export function consentAllows(category: ConsentCategoryKey) { return category === "essential" || effective[category]; }
