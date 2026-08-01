"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { canonicalNavigation, publicHeaderLinks } from "@/lib/navigation/canonical-navigation";

export type NavigationAccessLevel =
  | "public"
  | "user"
  | "admin-unverified"
  | "admin";

type CloseMenus = () => void;

export { publicHeaderLinks };

function LogoutButton({ onNavigate }: { onNavigate?: CloseMenus }) {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" onClick={onNavigate} className="nav-control">
        Logout
      </button>
    </form>
  );
}

function PublicNavigation({ onNavigate }: { onNavigate: CloseMenus }) {
  return (
    <>
      {publicHeaderLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={item.href === "/login" ? "brand-primary-action" : "nav-control"}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function GlobalNavigation({ accessLevel }: { accessLevel: NavigationAccessLevel }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => closeMenus(), [closeMenus, pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 md:px-8">
        <Link href="/" onClick={closeMenus} className="brand-wordmark">Cyber Sentinels</Link>
        <button type="button" aria-label={mobileMenuOpen ? "Close" : "Menu"} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((current) => !current)} className="nav-control min-h-11 sm:hidden">
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
        <nav id="primary-navigation" aria-label="Primary navigation" className={`${mobileMenuOpen ? "flex" : "hidden"} max-h-[calc(100vh-5rem)] w-full min-w-0 flex-col items-stretch gap-2 overflow-y-auto pb-2 text-sm text-zinc-200 sm:flex sm:max-h-none sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:overflow-visible sm:pb-0`}>
          {accessLevel === "public" ? (
            <PublicNavigation onNavigate={closeMenus} />
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
              {canonicalNavigation.authenticated.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className={item.href === "/dashboard" ? "brand-primary-action" : "nav-control"}>{item.label}</Link>)}
              {accessLevel === "admin-unverified" ? <Link href="/admin/access" onClick={closeMenus} className="brand-secondary-action">Verify Admin</Link> : null}
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              {canonicalNavigation.authenticated.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className={item.href === "/dashboard" ? "brand-primary-action" : "nav-control"}>{item.label}</Link>)}
              {canonicalNavigation.admin.map((item) => <Link key={item.href} href={item.href} onClick={closeMenus} className="brand-secondary-action">{item.label}</Link>)}
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
