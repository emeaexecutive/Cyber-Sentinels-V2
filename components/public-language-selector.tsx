"use client";

import { Globe2, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const navigationLanguages = {
  en: { name: "English", labels: ["Platform", "Solutions", "Developers", "Enterprise", "Pricing", "Sign In"] },
  es: { name: "Español", labels: ["Plataforma", "Soluciones", "Desarrolladores", "Empresas", "Precios", "Iniciar sesión"] },
  fr: { name: "Français", labels: ["Plateforme", "Solutions", "Développeurs", "Entreprises", "Tarifs", "Se connecter"] },
  de: { name: "Deutsch", labels: ["Plattform", "Lösungen", "Entwickler", "Unternehmen", "Preise", "Anmelden"] },
  pt: { name: "Português", labels: ["Plataforma", "Soluções", "Programadores", "Empresas", "Preços", "Entrar"] },
  it: { name: "Italiano", labels: ["Piattaforma", "Soluzioni", "Sviluppatori", "Aziende", "Prezzi", "Accedi"] },
  ar: { name: "العربية", labels: ["المنصة", "الحلول", "المطورون", "المؤسسات", "الأسعار", "تسجيل الدخول"] },
  zh: { name: "中文", labels: ["平台", "解决方案", "开发者", "企业", "价格", "登录"] },
} as const;
export type NavigationLanguage = keyof typeof navigationLanguages;
const languageKeys = Object.keys(navigationLanguages) as NavigationLanguage[];
const storageKey = "cs-public-navigation-language";

export function useNavigationLanguage() {
  const [language, setLanguage] = useState<NavigationLanguage>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && Object.hasOwn(navigationLanguages, saved)) setLanguage(saved as NavigationLanguage);
    } catch { /* Browsing without storage still supports language selection. */ }
  }, []);
  const select = (next: NavigationLanguage) => {
    setLanguage(next);
    try { localStorage.setItem(storageKey, next); } catch { /* No persistence available. */ }
  };
  return { language, select };
}

export function PublicLanguageSelector({ language, onSelect }: { language: NavigationLanguage; onSelect: (language: NavigationLanguage) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const keys = languageKeys;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    options.current[keys.indexOf(language)]?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open, language, keys]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return <div ref={root} className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
  }}>
    <button ref={trigger} type="button" aria-label={`Translate navigation. Current language: ${navigationLanguages[language].name}`} aria-expanded={open} aria-controls="public-language-options" onClick={() => setOpen(!open)} className="nav-control gap-2 !border-transparent !text-zinc-400">
      <Globe2 size={16} aria-hidden="true" /><span>Translate</span><span className="text-xs uppercase" lang="en">{language}</span>
    </button>
    {open ? <div id="public-language-options" className="mt-2 w-full rounded-xl border border-zinc-700 bg-[#0b0e14] p-3 shadow-2xl sm:absolute sm:end-0 sm:z-[60] sm:w-64">
      <p className="px-2 pb-2 text-xs leading-5 text-zinc-400">Navigation labels only. Page content is English; full translations are not published.</p>
      <div role="group" aria-label="Navigation language" className="grid gap-1">
        {keys.map((key, index) => <button key={key} ref={(element) => { options.current[index] = element; }} type="button" lang={key} dir={key === "ar" ? "rtl" : "ltr"} aria-pressed={language === key} className="flex min-h-11 items-center justify-between rounded-lg px-3 text-start text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:bg-zinc-800" onClick={() => { onSelect(key); close(); }} onKeyDown={(event) => {
          const target = event.key === "ArrowDown" ? (index + 1) % keys.length : event.key === "ArrowUp" ? (index + keys.length - 1) % keys.length : event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1 : null;
          if (target !== null) { event.preventDefault(); options.current[target]?.focus(); }
        }}>{navigationLanguages[key].name}{language === key ? <Check size={15} aria-hidden="true" /> : null}</button>)}
      </div>
    </div> : null}
  </div>;
}
