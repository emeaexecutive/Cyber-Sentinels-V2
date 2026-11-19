"use client";

import { consentText, useConsentLocale } from "@/src/lib/consent/localization";

export function ConsentPreferencesLink() {
  const locale = useConsentLocale();
  return (
    <button
      type="button"
      className="mt-2 inline-flex min-h-11 items-center rounded-sm text-left underline underline-offset-4 hover:text-white"
      onClick={() => window.dispatchEvent(new Event("cs:open-consent-preferences"))}
    >
      {consentText(locale, "trustPreferences", "Cookie preferences")}
    </button>
  );
}
