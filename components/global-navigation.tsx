"use client";

import Link from "next/link";

export type NavigationAccessLevel =
  | "public"
  | "user"
  | "admin-unverified"
  | "admin";

const publicLinks = [
  ["/platform", "Platform"],
  ["/enterprise/hiring-security", "Hiring Security"],
  ["/demo/session-integrity", "Session Integrity"],
  ["/governance", "Governance"],
  ["/demo", "Demo"],
  ["/pricing", "Pricing"],
  ["/enterprise-access", "Enterprise Access"],
  ["/login", "Login"],
];

const adminLinks = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/interview-risk", "Active Flags"],
  ["/dashboard/session-integrity", "Session Integrity"],
  ["/governance", "Governance"],
  ["/demo", "Demo"],
  ["/pricing", "Pricing"],
  ["/enterprise-access", "Enterprise Access"],
  ["/admin/founder-control", "Founder Control"],
];

const userLinks = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/interview-risk", "Active Flags"],
  ["/dashboard/session-integrity", "Session Integrity"],
  ["/governance", "Governance"],
  ["/demo", "Demo"],
  ["/pricing", "Pricing"],
  ["/enterprise-access", "Enterprise Access"],
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
            <FlatLinks links={publicLinks} />
          ) : null}
          {accessLevel === "user" || accessLevel === "admin-unverified" ? (
            <>
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
