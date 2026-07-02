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

const publicFocusLinks = [
  ["/enterprise/hiring-security", "Hiring Security"],
  ["/trust", "Trust Center"],
];

const authenticatedFocusLinks = [
  ["/enterprise/hiring-security", "Hiring Security"],
  ["/trust-center", "Trust Center"],
];

const platformDropdownLinks = [
  ["/trust-center", "Operational Trust"],
  ["/dashboard/trust-posture", "Trust Posture"],
  ["/trust-replay", "Replay Timeline"],
  ["/dashboard/governance", "Governance Review"],
  ["/evidence-vault", "Evidence Chain"],
  ["/dashboard/access-governance", "Authorization Lineage"],
  ["/dashboard/session-integrity", "Session Integrity"],
  ["/verification-receipts", "Verification Receipt"],
];

const publicPlatformDropdownLinks = [
  ["/platform", "Operational Trust"],
  ["/methodology", "Trust Posture Methodology"],
  ["/verification-replay", "Replay Timeline"],
  ["/governance", "Governance Review"],
  ["/verification-receipts", "Verification Receipt"],
  ["/architecture", "Architecture"],
];

const enterpriseDropdownLinks = [
  ["/enterprise-access", "Enterprise Access"],
  ["/design-partner", "Design Partner"],
  ["/enterprise/pilot", "Pilot Program"],
  ["/enterprise", "Integrations"],
];

const adminEnterpriseDropdownLinks = [
  ["/enterprise-access", "Enterprise Access"],
  ["/enterprise/control-plane", "Trust Control Plane"],
  ["/enterprise/auditability", "Auditability"],
  ["/enterprise/readiness", "Deployment Readiness"],
  ["/admin/integrations", "Integrations"],
  ["/admin/runtime-validation", "Runtime Validation"],
];

function LogoutButton({ onNavigate }: { onNavigate?: CloseMenus }) {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        onClick={onNavigate}
        className="nav-control"
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
          className="nav-control"
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
        className="nav-control"
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
          className={`absolute top-full z-50 mt-2 grid w-64 max-w-[calc(100vw-2rem)] gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-2xl shadow-black/50 ${
            id === "platform" ? "left-0" : "right-0"
          }`}
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
  platformLinks = platformDropdownLinks,
  focusLinks = authenticatedFocusLinks,
}: {
  openDropdown: string | null;
  onToggleDropdown: (id: string) => void;
  onCloseDropdown: CloseMenus;
  enterpriseLinks?: string[][];
  platformLinks?: string[][];
  focusLinks?: string[][];
}) {
  return (
    <>
      <DropdownLinks
        id="platform"
        label="Platform"
        links={platformLinks}
        open={openDropdown === "platform"}
        onToggle={onToggleDropdown}
        onClose={onCloseDropdown}
      />
      <FlatLinks links={focusLinks} onNavigate={onCloseDropdown} />
      <DropdownLinks
        id="enterprise"
        label="Enterprise"
        links={enterpriseLinks}
        open={openDropdown === "enterprise"}
        onToggle={onToggleDropdown}
        onClose={onCloseDropdown}
      />
      <Link href="/pricing" onClick={onCloseDropdown} className="nav-control">
        Pricing
      </Link>
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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 md:px-8">
        <Link
          href="/"
          onClick={closeMenus}
          className="brand-wordmark basis-full sm:basis-auto"
        >
          Cyber Sentinels
        </Link>
        <nav
          ref={navigationRef}
          aria-label="Primary navigation"
          className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-sm text-zinc-200 sm:w-auto sm:justify-end"
        >
          {accessLevel === "public" ? (
            <>
              <PrimaryNavigation
                openDropdown={openDropdown}
                onToggleDropdown={toggleDropdown}
                onCloseDropdown={closeMenus}
                platformLinks={publicPlatformDropdownLinks}
                focusLinks={publicFocusLinks}
              />
              <Link
                href="/login"
                onClick={closeMenus}
                className="brand-primary-action"
              >
                Access
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
              <Link href="/dashboard" onClick={closeMenus} className="brand-primary-action">
                Access
              </Link>
              {accessLevel === "admin-unverified" ? (
                <Link
                  href="/admin/access"
                  onClick={closeMenus}
                  className="brand-secondary-action"
                >
                  Admin
                </Link>
              ) : null}
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              <PrimaryNavigation
                openDropdown={openDropdown}
                onToggleDropdown={toggleDropdown}
                onCloseDropdown={closeMenus}
                enterpriseLinks={adminEnterpriseDropdownLinks}
              />
              <Link
                href="/admin/access"
                onClick={closeMenus}
                className="brand-secondary-action"
              >
                Admin
              </Link>
              <Link href="/dashboard" onClick={closeMenus} className="brand-primary-action">
                Access
              </Link>
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
