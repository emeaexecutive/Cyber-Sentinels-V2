"use client";

import { useEffect } from "react";
import { ACCOUNT_LOCALE_COOKIE, type AccountLocale } from "@/lib/i18n/account";

export function AccountLanguageControl({ locale }: { locale: AccountLocale }) {
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return (
    <label className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
      {locale === "es" ? "Idioma" : "Language"}
      <select
        aria-label={locale === "es" ? "Idioma" : "Language"}
        className="rounded border border-zinc-700 bg-black px-2 py-1 text-white"
        value={locale}
        onChange={(event) => {
          const value = event.target.value;
          if (value !== "en" && value !== "es") return;
          const url = new URL(window.location.href);
          url.searchParams.set("lang", value);
          document.cookie = `${ACCOUNT_LOCALE_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=31536000${url.protocol === "https:" ? "; Secure" : ""}`;
          window.location.assign(url.href);
        }}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>
  );
}
