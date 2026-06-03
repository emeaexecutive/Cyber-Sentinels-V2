"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type NavigationAccessLevel = "public" | "user" | "admin";

const adminNavGroups = [
  {
    label: "Trust Operations",
    links: [
      ["/passports", "Trust Passports"],
      ["/verification-queue", "Verification Queue"],
      ["/evidence-vault", "Evidence Vault"],
      ["/decision-engine", "Decisions"],
      ["/back-office", "Back Office"],
    ],
  },
  {
    label: "Intelligence",
    links: [
      ["/trust-intelligence", "Trust Intelligence"],
      ["/trust-graph-engine", "Trust Graph"],
      ["/trust-events", "Trust Events"],
      ["/admin/agents", "Agent Registry"],
    ],
  },
  {
    label: "Governance",
    links: [
      ["/workforce-trust", "Workforce Trust"],
      ["/intent-verification", "Intent Verification"],
      ["/autonomy-governance", "Autonomy Governance"],
      ["/execution-passports", "Execution Passports"],
      ["/state-verification", "State Verification"],
    ],
  },
];

const supportLegalLinks = [
  ["/help", "Help"],
  ["/security", "Security"],
  ["/data-rights", "Data Rights"],
  ["/trust-principles", "Trust Principles"],
  ["/ai-governance", "AI Governance"],
  ["/transparency", "Transparency"],
  ["/privacy", "Privacy"],
  ["/terms", "Terms"],
  ["/cookies", "Cookies"],
  ["/legal", "Legal"],
  ["/regulatory", "Regulatory"],
  ["/accessibility", "Accessibility"],
];

const publicLinks = [
  ["/", "Home"],
  ["/demo", "Demo"],
  ["/how-to-use", "How to Use"],
  ["/login", "Login"],
];

const userLinks = [
  ["/", "Home"],
  ["/passport", "Create Passport"],
  ["/passports", "My Passports"],
  ["/agents", "AI Agents"],
  ["/trust-events", "Trust Events"],
  ["/notifications", "Notifications"],
  ["/messages", "Messages"],
  ["/appeals", "Appeals"],
  ["/help", "Help"],
];

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="rounded-lg border border-zinc-800 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
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
          className="rounded-lg border border-zinc-800 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
        >
          {label}
        </Link>
      ))}
    </>
  );
}

function NavigationDropdown({
  label,
  links,
  openGroup,
  setOpenGroup,
}: {
  label: string;
  links: string[][];
  openGroup: string | null;
  setOpenGroup: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  const isOpen = openGroup === label;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
        onClick={() =>
          setOpenGroup((current) => (current === label ? null : label))
        }
      >
        {label}
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-10 z-50 grid min-w-56 gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-xl">
          {links.map(([href, linkLabel]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
              onClick={() => setOpenGroup(null)}
            >
              {linkLabel}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GlobalNavigation({
  accessLevel,
}: {
  accessLevel: NavigationAccessLevel;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        navRef.current &&
        event.target instanceof Node &&
        !navRef.current.contains(event.target)
      ) {
        setOpenGroup(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenGroup(null);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
          onClick={() => setOpenGroup(null)}
        >
          Cyber Sentinels
        </Link>
        <nav
          ref={navRef}
          className="flex flex-wrap items-center justify-end gap-2 text-xs text-zinc-300"
        >
          {accessLevel === "public" ? (
            <>
              <FlatLinks links={publicLinks} />
              <NavigationDropdown
                label="Support & Legal"
                links={supportLegalLinks}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
              />
            </>
          ) : null}
          {accessLevel === "user" ? (
            <>
              <FlatLinks links={userLinks} />
              <NavigationDropdown
                label="Support & Legal"
                links={supportLegalLinks}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
              />
              <LogoutButton />
            </>
          ) : null}
          {accessLevel === "admin" ? (
            <>
              <Link
                href="/"
                className="rounded-lg border border-zinc-800 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
              >
                Home
              </Link>
              {adminNavGroups.map((group) => (
                <NavigationDropdown
                  key={group.label}
                  label={group.label}
                  links={group.links}
                  openGroup={openGroup}
                  setOpenGroup={setOpenGroup}
                />
              ))}
              <NavigationDropdown
                label="Support & Legal"
                links={supportLegalLinks}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
              />
              <LogoutButton />
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
