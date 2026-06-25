"use client";

import Link from "next/link";

export type NavigationAccessLevel =
  | "public"
  | "user"
  | "admin-unverified"
  | "admin";

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
  ["/trust-replay", "Verification Replay"],
  ["/dashboard", "Verification Receipts"],
  ["/trust/posture", "Trust Posture"],
  ["/ai-governance", "AI Agent Governance"],
  ["/compliance-export", "Compliance"],
];

const publicEnterpriseDropdownLinks = [
  ["/enterprise-access", "Enterprise Access"],
  ["/design-partner", "Design Partner"],
  ["/enterprise/pilot", "Pilot Program"],
];

const adminEnterpriseDropdownLinks = [
  ...publicEnterpriseDropdownLinks,
  ["/admin/integrations", "Integrations"],
  ["/admin/runtime-validation", "Runtime Validation"],
];

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
      >
        Logout
      </button>
    </form>
  );
}

function FlatLinks({ links }: { links: string[][] }) {
  return (
    <>
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
        >
          {label}
        </Link>
      ))}
    </>
  );
}

function DropdownLinks({
  label,
  links,
}: {
  label: string;
  links: string[][];
}) {
  return (
    <details className="group relative">
      <summary className="list-none rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          {label}
          <span className="text-[10px] text-zinc-500 group-open:rotate-180">v</span>
        </span>
      </summary>
      <div className="fixed left-4 right-4 top-16 z-50 grid gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-2xl shadow-black/50 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64">
        {links.map(([href, itemLabel]) => (
          <Link
            key={href}
            href={href}
            className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
          >
            {itemLabel}
          </Link>
        ))}
      </div>
    </details>
  );
}

function PrimaryNavigation({
  accessLevel,
}: {
  accessLevel: NavigationAccessLevel;
}) {
  const enterpriseLinks =
    accessLevel === "admin"
      ? adminEnterpriseDropdownLinks
      : publicEnterpriseDropdownLinks;

  return (
    <>
      <DropdownLinks label="Platform" links={platformDropdownLinks} />
      <FlatLinks links={publicLinks} />
      <DropdownLinks label="Enterprise" links={enterpriseLinks} />
      <FlatLinks links={pricingLink} />
    </>
  );
}

export function GlobalNavigation({
  accessLevel,
}: {
  accessLevel: NavigationAccessLevel;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
        >
          Cyber Sentinels
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-2 text-sm text-zinc-200"
        >
          {accessLevel === "public" ? (
            <PrimaryNavigation accessLevel={accessLevel} />
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
              <PrimaryNavigation accessLevel={accessLevel} />
              <FlatLinks links={userLinks} />
              {accessLevel === "admin-unverified" ? (
                <Link
                  href="/admin/access"
                  className="rounded-lg border border-cyan-700 px-3 py-2 font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
                >
                  Admin
                </Link>
              ) : null}
              <LogoutButton />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              <Link
                href="/"
                className="rounded-lg border border-zinc-800 px-3 py-2 font-medium text-zinc-200 hover:border-cyan-500/70 hover:text-white"
              >
                Home
              </Link>
              <PrimaryNavigation accessLevel={accessLevel} />
              <Link
                href="/admin/access"
                className="rounded-lg border border-cyan-700 px-3 py-2 font-medium text-cyan-100 hover:border-cyan-400 hover:text-white"
              >
                Admin
              </Link>
              <FlatLinks links={adminLinks} />
              <LogoutButton />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
