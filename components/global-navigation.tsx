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
type NavigationLink = {
  href: string;
  label: string;
  description: string;
  group?: string;
};

const platformDropdownLinks: NavigationLink[] = [
  { href: "/platform", label: "Platform Overview", description: "The operational trust control plane." },
  { href: "/platform#trust-engine", label: "Trust Engine", description: "Evidence-backed decision intelligence." },
  { href: "/platform#runtime-engine", label: "Runtime Trust", description: "Monitor material change during execution." },
  { href: "/platform#authorization-gateway", label: "Authorization & Enforcement", description: "Verify scope before an action proceeds." },
];

const solutionsDropdownLinks: NavigationLink[] = [
  { href: "/enterprise/agent-governance", label: "AI Agent Governance", description: "Control agent purpose and authority.", group: "Protect AI Operations" },
  { href: "/solutions#machine-identity-trust", label: "Machine Identity Trust", description: "Keep workload ownership accountable.", group: "Protect AI Operations" },
  { href: "/solutions#regulated-workflows", label: "Regulated AI Workflows", description: "Preserve review across sensitive work.", group: "Protect AI Operations" },
  { href: "/solutions#live-session-trust", label: "Live Session Trust", description: "Track trust after a session begins.", group: "Verify Critical Interactions" },
  { href: "/solutions#executive-protection", label: "Executive Protection", description: "Govern high-risk identity and approvals.", group: "Verify Critical Interactions" },
  { href: "/solutions#identity-onboarding", label: "Identity & Onboarding", description: "Resolve identity evidence before access.", group: "Verify Critical Interactions" },
  { href: "/solutions#financial-services", label: "Financial Services", description: "Explain high-value operational decisions.", group: "Secure Business Workflows" },
  { href: "/solutions#insurance", label: "Insurance", description: "Connect claims evidence and review.", group: "Secure Business Workflows" },
  { href: "/enterprise/hiring-security", label: "Hiring Security", description: "Reduce synthetic and proxy interview risk.", group: "Secure Business Workflows" },
];

const trustDropdownLinks: NavigationLink[] = [
  { href: "/trust", label: "Trust Center", description: "Public assurance and transparency.", group: "Assurance" },
  { href: "/trust#trust-posture", label: "Trust Posture", description: "Current evidence and governance state.", group: "Assurance" },
  { href: "/verification-replay", label: "Replay", description: "Decision chronology and proof.", group: "Assurance" },
  { href: "/trust#evidence-audit", label: "Evidence Graph", description: "Connect actors, authority, evidence and outcomes.", group: "Assurance" },
  { href: "/governance", label: "Governance", description: "Route material decisions to accountable owners.", group: "Assurance" },
  { href: "/trust#trust-memory", label: "Trust Memory\u2122", description: "How trust evolves across outcomes.", group: "Transparency" },
  { href: "/trust#provenance", label: "Provenance", description: "Trace evidence source and transformation.", group: "Transparency" },
  { href: "/trust/data-sovereignty", label: "AI & Data Sovereignty", description: "Provider and deployment boundaries.", group: "Transparency" },
  { href: "/trust#ml-validation", label: "ML Validation", description: "Measured capability without inflated claims.", group: "Transparency" },
  { href: "/trust#provider-transparency", label: "Provider Transparency", description: "Live, simulated and unavailable states.", group: "Transparency" },
];

const enterpriseDropdownLinks: NavigationLink[] = [
  { href: "/enterprise", label: "Enterprise Overview", description: "Adoption, governance and buyer readiness." },
  { href: "/enterprise#architecture", label: "Architecture", description: "Deployment beside systems of record." },
  { href: "/security", label: "Security", description: "Security controls and disclosure." },
  { href: "/enterprise#compliance", label: "Compliance", description: "Evidence continuity for control mapping." },
  { href: "/enterprise#deployment", label: "Deployment", description: "Controlled rollout and production gates." },
  { href: "/enterprise#data-residency", label: "Data Residency", description: "Regional and retention boundaries." },
  { href: "/enterprise/pilot", label: "Pilot Programme", description: "Start with one consequential workflow." },
  { href: "/enterprise#support", label: "Enterprise Support", description: "Named onboarding and escalation owners." },
];

const developerDropdownLinks: NavigationLink[] = [
  { href: "/developers", label: "Developer Overview", description: "Integration paths and platform boundaries." },
  { href: "/developers/docs", label: "API Documentation", description: "Endpoints, webhooks and examples." },
  { href: "/developers/authentication", label: "Authentication", description: "Secure API access patterns." },
];

const resourceDropdownLinks: NavigationLink[] = [
  { href: "/methodology", label: "Methodology", description: "How evidence and decisions are evaluated." },
  { href: "/journal", label: "Journal", description: "Operational trust perspectives." },
  { href: "/regulatory", label: "Regulatory Material", description: "Regulatory context and boundaries." },
  { href: "/developers/docs", label: "Documentation", description: "Technical implementation guidance." },
  { href: "/media-centre", label: "Media Centre", description: "Company and media resources." },
];

function LogoutButton({ onNavigate }: { onNavigate?: CloseMenus }) {
  return (
    <form action="/api/auth/logout" method="POST">
      <button type="submit" onClick={onNavigate} className="nav-control">
        Logout
      </button>
    </form>
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
  links: NavigationLink[];
  open: boolean;
  onToggle: (id: string) => void;
  onClose: CloseMenus;
}) {
  let previousGroup = "";

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${id}-navigation-menu`}
        onClick={() => onToggle(id)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="nav-control w-full justify-between sm:w-auto"
      >
        <span className="inline-flex items-center gap-2">
          {label}
          <span aria-hidden="true" className={`text-xs text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </span>
      </button>
      {open ? (
        <div
          id={`${id}-navigation-menu`}
          role="menu"
          aria-label={`${label} navigation`}
          className={`relative z-50 mt-2 grid max-h-[70vh] w-full gap-1 overflow-y-auto rounded-lg border border-zinc-800 bg-black p-2 shadow-2xl shadow-black/50 sm:absolute sm:top-full sm:w-[22rem] sm:max-w-[calc(100vw-2rem)] ${
            id === "platform" ? "sm:left-0" : "sm:right-0"
          } ${id === "solutions" || id === "trust" ? "sm:w-[42rem] sm:grid-cols-2" : ""}`}
        >
          {links.map((item) => {
            const showGroup = Boolean(item.group && item.group !== previousGroup);
            previousGroup = item.group ?? previousGroup;
            return (
              <div key={item.href} className="min-w-0">
                {showGroup ? <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">{item.group}</p> : null}
                <Link
                  href={item.href}
                  role="menuitem"
                  onClick={onClose}
                  className="block rounded-md px-3 py-2.5 hover:bg-zinc-900 focus-visible:bg-zinc-900"
                >
                  <span className="block text-sm font-semibold text-zinc-100">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-400">{item.description}</span>
                </Link>
              </div>
            );
          })}
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
  developerLinks = developerDropdownLinks,
}: {
  openDropdown: string | null;
  onToggleDropdown: (id: string) => void;
  onCloseDropdown: CloseMenus;
  enterpriseLinks?: NavigationLink[];
  platformLinks?: NavigationLink[];
  developerLinks?: NavigationLink[];
}) {
  return (
    <>
      <DropdownLinks id="platform" label="Platform" links={platformLinks} open={openDropdown === "platform"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
      <DropdownLinks id="solutions" label="Solutions" links={solutionsDropdownLinks} open={openDropdown === "solutions"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
      <DropdownLinks id="trust" label="Trust" links={trustDropdownLinks} open={openDropdown === "trust"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
      <DropdownLinks id="enterprise" label="Enterprise" links={enterpriseLinks} open={openDropdown === "enterprise"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
      <DropdownLinks id="developers" label="Developers" links={developerLinks} open={openDropdown === "developers"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
      <Link href="/pricing" onClick={onCloseDropdown} className="nav-control">Pricing</Link>
      <DropdownLinks id="resources" label="Resources" links={resourceDropdownLinks} open={openDropdown === "resources"} onToggle={onToggleDropdown} onClose={onCloseDropdown} />
    </>
  );
}

export function GlobalNavigation({ accessLevel }: { accessLevel: NavigationAccessLevel }) {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLElement | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenus = useCallback(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  }, []);
  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdown((current) => (current === id ? null : id));
  }, []);

  useEffect(() => closeMenus(), [closeMenus, pathname]);

  useEffect(() => {
    if (!openDropdown) return;
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && navigationRef.current?.contains(event.target)) return;
      closeMenus();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenus();
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
        <Link href="/" onClick={closeMenus} className="brand-wordmark">Cyber Sentinels</Link>
        <button type="button" aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((current) => !current)} className="nav-control sm:hidden">
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
        <nav id="primary-navigation" ref={navigationRef} aria-label="Primary navigation" className={`${mobileMenuOpen ? "flex" : "hidden"} w-full min-w-0 flex-col items-stretch gap-2 text-sm text-zinc-200 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end`}>
          {accessLevel === "public" ? (
            <>
              <PrimaryNavigation openDropdown={openDropdown} onToggleDropdown={toggleDropdown} onCloseDropdown={closeMenus} />
              <Link href="/login" onClick={closeMenus} className="brand-primary-action">Login</Link>
            </>
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
              <Link href="/dashboard" onClick={closeMenus} className="brand-primary-action">Enterprise Workspace</Link>
              <Link href="/notifications" onClick={closeMenus} className="nav-control">Notifications</Link>
              {accessLevel === "admin-unverified" ? <Link href="/admin/access" onClick={closeMenus} className="brand-secondary-action">Verify Admin</Link> : null}
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              <Link href="/dashboard" onClick={closeMenus} className="brand-primary-action">Enterprise Workspace</Link>
              <Link href="/notifications" onClick={closeMenus} className="nav-control">Notifications</Link>
              <Link href="/admin/access" onClick={closeMenus} className="brand-secondary-action">Administration</Link>
              <LogoutButton onNavigate={closeMenus} />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
