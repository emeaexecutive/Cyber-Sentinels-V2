"use client";

export function ConsentPreferencesLink({ locale = "en" }: { locale?: "en" | "es" }) {
  return (
    <button
      type="button"
      className="mt-2 inline-flex min-h-11 items-center rounded-sm text-left underline underline-offset-4 hover:text-white"
      onClick={() => window.dispatchEvent(new Event("cs:open-consent-preferences"))}
    >
      {locale === "es" ? "Preferencias de cookies (controles en inglés)" : "Cookie preferences"}
    </button>
  );
}
