import type { ConsentChoices } from "./types.ts";

export type GoogleConsentState = "granted" | "denied";
export function googleConsentModeState(choices: ConsentChoices) {
  const state = (enabled: boolean): GoogleConsentState => enabled ? "granted" : "denied";
  return {
    ad_storage: state(choices.marketing), analytics_storage: state(choices.analytics),
    ad_user_data: state(choices.marketing), ad_personalization: state(choices.marketing),
    functionality_storage: state(choices.functional), personalization_storage: state(choices.functional),
    security_storage: "granted" as const,
  };
}

export function updateGoogleConsentMode(choices: ConsentChoices, command: "default" | "update" = "update") {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_GOOGLE_CONSENT_MODE_ENABLED !== "true") return;
  const host = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
  host.dataLayer ??= [];
  host.gtag ??= (...args: unknown[]) => { host.dataLayer!.push(args); };
  host.gtag("consent", command, googleConsentModeState(choices));
}
