"use client";

import { Check, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicLocale } from "@/lib/i18n/public-locales";

export const navigationLanguages = {
  en: {
    name: "English",
    labels: ["Platform", "Solutions", "Developers", "Enterprise", "Pricing", "Sign In"],
    selector: "Translate",
    group: "Available languages",
    unavailable: "Not available yet",
  },
  es: {
    name: "Español",
    labels: ["Plataforma", "Soluciones", "Desarrollo", "Empresa", "Precios", "Iniciar sesión"],
    selector: "Idioma",
    group: "Idiomas disponibles",
    unavailable: "Aún no disponible",
  },
} as const satisfies Record<PublicLocale, {
  name: string;
  labels: readonly string[];
  selector: string;
  group: string;
  unavailable: string;
}>;

const unavailableLanguages = [
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "ar", name: "العربية" },
  { code: "zh", name: "中文" },
] as const;

export type NavigationLanguage = PublicLocale;

export function PublicLanguageSelector({
  language,
  onSelect,
}: {
  language: NavigationLanguage;
  onSelect: (language: NavigationLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const optionCount = 2;

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    options.current[language === "en" ? 0 : 1]?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, language]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`${language === "en" ? "Change language" : "Cambiar idioma"}. ${language === "en" ? "Current language" : "Idioma actual"}: ${navigationLanguages[language].name}`}
        aria-expanded={open}
        aria-controls="public-language-options"
        onClick={() => setOpen(!open)}
        className="nav-control gap-2 !border-transparent !text-zinc-400"
      >
        <Globe2 size={16} aria-hidden="true" />
        <span>{navigationLanguages[language].selector}</span>
        <span className="text-xs uppercase" lang="en">{language}</span>
      </button>
      {open ? (
        <div
          id="public-language-options"
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-[#0b0e14] p-3 shadow-2xl sm:absolute sm:end-0 sm:z-[60] sm:w-72"
        >
          <p className="px-2 pb-2 text-xs leading-5 text-zinc-400" lang={language}>
            {language === "en"
              ? "English and Spanish public pages are available; some publication notices are under review. Account tools and downloads may be English-only. Other languages are not available yet."
              : "Hay páginas públicas en inglés y español; algunos avisos de publicación siguen en revisión. Las herramientas de cuenta y las descargas pueden estar solo en inglés. Los demás idiomas aún no están disponibles."}
          </p>
          <div role="group" aria-label={navigationLanguages[language].group} className="grid gap-1">
            {(["en", "es"] as const).map((key, index) => (
              <button
                key={key}
                ref={(element) => { options.current[index] = element; }}
                type="button"
                lang={key}
                aria-pressed={language === key}
                className="flex min-h-11 items-center justify-between rounded-lg px-3 text-start text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:bg-zinc-800"
                onClick={() => {
                  onSelect(key);
                  close();
                }}
                onKeyDown={(event) => {
                  const target = event.key === "ArrowDown"
                    ? (index + 1) % optionCount
                    : event.key === "ArrowUp"
                      ? (index + optionCount - 1) % optionCount
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? optionCount - 1
                          : null;
                  if (target !== null) {
                    event.preventDefault();
                    options.current[target]?.focus();
                  }
                }}
              >
                {key === "es" ? "Español · sitio público" : navigationLanguages[key].name}
                {language === key ? <Check size={15} aria-hidden="true" /> : null}
              </button>
            ))}
            {unavailableLanguages.map(({ code, name }) => (
              <button
                key={code}
                type="button"
                lang={code}
                disabled
                className="flex min-h-11 cursor-not-allowed items-center justify-between rounded-lg px-3 text-start text-sm text-zinc-500"
              >
                {name}<span className="text-xs">{navigationLanguages[language].unavailable}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
