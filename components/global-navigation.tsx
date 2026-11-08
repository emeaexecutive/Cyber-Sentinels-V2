"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { canonicalNavigation, publicHeaderLinks } from "@/lib/navigation/canonical-navigation";
import { clearSignedOutSessionState, revalidateRestoredSession } from "@/lib/auth/sign-out";
import { navigationLanguages, PublicLanguageSelector, type NavigationLanguage } from "@/components/public-language-selector";
import { localizedPublicHref, type PublicLocale } from "@/lib/i18n/public-locales";

export type NavigationAccessLevel =
  | "public"
  | "user"
  | "admin-unverified"
  | "admin";

type CloseMenus = () => void;

export { publicHeaderLinks };

function LogoutButton({ onNavigate }: { onNavigate?: CloseMenus }) {
  return (
    <form action="/api/auth/logout" method="POST" className="sm:order-last" onSubmit={() => {
      // Storage can be disabled; that must never prevent the server logout.
      try { clearSignedOutSessionState(window.localStorage); } catch { /* No readable local state. */ }
      onNavigate?.();
    }}>
      <button type="submit" className="nav-control !min-h-11 whitespace-nowrap">
        Sign Out
      </button>
    </form>
  );
}

function PublicNavigation({
  onNavigate,
  language,
  onSelect,
}: {
  onNavigate: CloseMenus;
  language: NavigationLanguage;
  onSelect: (language: NavigationLanguage) => void;
}) {
  return (
    <>
      {publicHeaderLinks.map((item, index) => (
        <Link
          key={item.href}
          href={localizedPublicHref(item.href, language)}
          onClick={onNavigate}
          lang={language}
          className={item.href === "/login" ? "brand-primary-action" : "nav-control !border-transparent"}
        >
          {navigationLanguages[language].labels[index]}
        </Link>
      ))}
      <PublicLanguageSelector language={language} onSelect={onSelect} />
    </>
  );
}

export function GlobalNavigation({
  accessLevel,
  locale = "en",
  sourcePath,
}: {
  accessLevel: NavigationAccessLevel;
  locale?: PublicLocale;
  sourcePath?: string | null;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<NavigationLanguage>(locale);

  const closeMenus = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => closeMenus(), [closeMenus, pathname]);

  useEffect(() => {
    setLanguage(pathname === "/es" || pathname.startsWith("/es/") ? "es" : locale);
  }, [locale, pathname]);

  const selectLanguage = useCallback((next: NavigationLanguage) => {
    setLanguage(next);
    const currentSourcePath = pathname === "/es/unavailable"
      ? sourcePath ?? "/"
      : `${pathname}${window.location.search}${window.location.hash}`;
    // A full locale transition refreshes the root document, footer and consent
    // controls together; App Router otherwise retains its cached root layout.
    window.location.assign(localizedPublicHref(currentSourcePath, next));
  }, [pathname, sourcePath]);

  useEffect(() => {
    if (accessLevel === "public") return;
    const onPageShow = (event: PageTransitionEvent) => revalidateRestoredSession(event, () => window.location.reload());
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [accessLevel]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 md:px-8">
        <Link href={localizedPublicHref("/", language)} onClick={closeMenus} lang={language} className="brand-wordmark">Cyber Sentinels</Link>
        {accessLevel !== "public" ? <LogoutButton onNavigate={closeMenus} /> : null}
        <button type="button" aria-label={language === "es" ? (mobileMenuOpen ? "Cerrar menú" : "Abrir menú") : (mobileMenuOpen ? "Close" : "Open menu")} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((current) => !current)} className="nav-control min-h-11 sm:hidden">
          {language === "es" ? (mobileMenuOpen ? "Cerrar" : "Menú") : (mobileMenuOpen ? "Close" : "Menu")}
        </button>
        <nav id="primary-navigation" aria-label={language === "es" ? "Navegación principal" : "Primary navigation"} className={`${mobileMenuOpen ? "flex" : "hidden"} max-h-[calc(100vh-5rem)] w-full min-w-0 flex-col items-stretch gap-2 overflow-y-auto pb-2 text-sm text-zinc-200 sm:flex sm:max-h-none sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:overflow-visible sm:pb-0`}>
          {accessLevel === "public" ? (
            <PublicNavigation onNavigate={closeMenus} language={language} onSelect={selectLanguage} />
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
              {canonicalNavigation.authenticated.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className={item.href === "/dashboard" ? "brand-primary-action" : "nav-control"}>{item.label}</Link>)}
              {accessLevel === "admin-unverified" ? <Link href="/admin/access" onClick={closeMenus} className="brand-secondary-action">Verify Admin</Link> : null}
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              {canonicalNavigation.authenticated.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className={item.href === "/dashboard" ? "brand-primary-action" : "nav-control"}>{item.label}</Link>)}
              {canonicalNavigation.admin.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className="brand-secondary-action">{item.label}</Link>)}
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
