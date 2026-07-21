"use client";

export function ConsentPreferencesLink() {
  return (
    <button
      type="button"
      className="mt-3 text-left underline hover:text-white"
      onClick={() => window.dispatchEvent(new Event("cs:open-consent-preferences"))}
    >
      Cookie preferences
    </button>
  );
}
