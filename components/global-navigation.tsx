"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type NavigationAccessLevel =
  | "public"
  | "user"
  | "admin-unverified"
  | "admin";

type CloseMenus = () => void;

const publicLinks = [
  ["/enterprise/hiring-security", "Hiring Security"],
  ["/demo/session-integrity", "Session Integrity"],
  ["/demo", "Demo"],
];

const pricingLink = [["/pricing", "Pricing"]];

const adminLinks = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/interview-risk", "Active Flags"],
  ["/admin/founder-control", "Founder Control"],
];

const userLinks = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/interview-risk", "Active Flags"],
];

const platformDropdownLinks = [
  ["/governance", "Governance"],
  ["/enterprise/hiring-security", "Workflow Trust"],
  ["/verification-replay", "Verification Replay"],
  ["/verification-receipts", "Verification Receipts"],
  ["/trust-posture", "Operational Posture"],
  ["/agents", "Agent Governance"],
  ["/transparency", "Compliance"],
];

const enterpriseDropdownLinks = [
  ["/enterprise-access", "Enterprise Access"],
  ["/design-partner", "Design Partner"],
  ["/enterprise/pilot", "Pilot Program"],
  ["/enterprise", "Integrations"],
];

const adminEnterpriseDropdownLinks = [
  ["/enterprise-access", "Enterprise Access"],
  ["/design-partner", "Design Partner"],
  ["/enterprise/pilot", "Pilot Program"],
  ["/admin/integrations", "Integrations"],
  ["/admin/runtime-validation", "Runtime Validation"],
];

function LogoutButton({ onNavigate }: { onNavigate?: CloseMenus }) {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        onClick={onNavigate}
        className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
      >
        Logout
      </button>
    </form>
  );
}

function FlatLinks({
  links,
  onNavigate,
}: {
  links: string[][];
  onNavigate?: CloseMenus;
}) {
  return (
    <>
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
        >
          {label}
        </Link>
      ))}
    </>
  );
}

function DropdownLinks({
  id,
  label,
  links,
  open,
  onToggle,
  onClose,
}: {
  id: string;
  label: string;
  links: string[][];
  open: boolean;
  onToggle: (id: string) => void;
  onClose: CloseMenus;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onToggle(id)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
      >
        <span className="inline-flex items-center gap-2">
          {label}
          <span className={`text-[10px] text-zinc-500 ${open ? "rotate-180" : ""}`}>v</span>
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          aria-label={`${label} navigation`}
          className="fixed left-4 right-4 top-16 z-50 grid gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64"
        >
          {links.map(([href, itemLabel]) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
            >
              {itemLabel}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryNavigation({
  openDropdown,
  onToggleDropdown,
  onCloseDropdown,
  enterpriseLinks = enterpriseDropdownLinks,
}: {
  openDropdown: string | null;
  onToggleDropdown: (id: string) => void;
  onCloseDropdown: CloseMenus;
  enterpriseLinks?: string[][];
}) {
  return (
    <>
      <DropdownLinks
        id="platform"
        label="Platform"
        links={platformDropdownLinks}
        open={openDropdown === "platform"}
        onToggle={onToggleDropdown}
        onClose={onCloseDropdown}
      />
      <FlatLinks links={publicLinks} onNavigate={onCloseDropdown} />
      <DropdownLinks
        id="enterprise"
        label="Enterprise"
        links={enterpriseLinks}
        open={openDropdown === "enterprise"}
        onToggle={onToggleDropdown}
        onClose={onCloseDropdown}
      />
      <FlatLinks links={pricingLink} onNavigate={onCloseDropdown} />
    </>
  );
}

export function GlobalNavigation({
  accessLevel,
}: {
  accessLevel: NavigationAccessLevel;
}) {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [, setMobileMenuOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, []);
  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdown((current) => (current === id ? null : id));
  }, []);

  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openDropdown) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        navigationRef.current?.contains(target)
      ) {
        return;
      }

      closeMenus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenus, openDropdown]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          onClick={closeMenus}
          className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100"
        >
          Cyber Sentinels
        </Link>
        <nav
          ref={navigationRef}
          className="flex flex-wrap items-center justify-end gap-2 text-sm text-zinc-200"
        >
          {accessLevel === "public" ? (
            <>
              <PrimaryNavigation
                openDropdown={openDropdown}
                onToggleDropdown={toggleDropdown}
                onCloseDropdown={closeMenus}
              />
              <Link
                href="/login"
                onClick={closeMenus}
                className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-zinc-950 hover:bg-cyan-200"
              >
                Sign in
              </Link>
            </>
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
              <PrimaryNavigation
                openDropdown={openDropdown}
                onToggleDropdown={toggleDropdown}
                onCloseDropdown={closeMenus}
              />
              <FlatLinks links={userLinks} onNavigate={closeMenus} />
              {accessLevel === "admin-unverified" ? (
                <Link
                  href="/admin/access"
                  onClick={closeMenus}
                  className="rounded-lg border border-cyan-700 px-3 py-2 font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
                >
                  Admin
                </Link>
              ) : null}
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              <Link
                href="/"
                onClick={closeMenus}
                className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
              >
                Home
              </Link>
              <PrimaryNavigation
                openDropdown={openDropdown}
                onToggleDropdown={toggleDropdown}
                onCloseDropdown={closeMenus}
                enterpriseLinks={adminEnterpriseDropdownLinks}
              />
              <Link
                href="/admin/access"
                onClick={closeMenus}
                className="rounded-lg border border-cyan-700 px-3 py-2 font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
              >
                Admin
              </Link>
              <FlatLinks links={adminLinks} onNavigate={closeMenus} />
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
