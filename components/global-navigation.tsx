"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navGroups = [
  {
    label: "Home",
    links: [
      ["/", "Home"],
      ["/how-to-use", "How to Use"],
      ["/passport", "Create Passport"],
      ["/status", "System Status"],
    ],
  },
  {
    label: "Trust Operations",
    links: [
      ["/passports", "Trust Passports"],
      ["/verification-queue", "Verification Queue"],
      ["/evidence-vault", "Evidence Vault"],
      ["/back-office", "Back Office"],
    ],
  },
  {
    label: "Intelligence",
    links: [
      ["/trust-intelligence", "Trust Intelligence"],
      ["/trust-graph-engine", "Trust Graph"],
      ["/trust-assistant", "Trust Assistant"],
      ["/knowledge-base", "Knowledge Base"],
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
  {
    label: "Support & Legal",
    links: [
      ["/help", "Help"],
      ["/security", "Security"],
      ["/data-rights", "Data Rights"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
      ["/cookies", "Cookies"],
      ["/legal", "Legal"],
      ["/regulatory", "Regulatory"],
      ["/accessibility", "Accessibility"],
    ],
  },
];

export function GlobalNavigation() {
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
          {navGroups.map((group) => {
            const isOpen = openGroup === group.label;

            return (
              <div key={group.label} className="relative">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
                  onClick={() =>
                    setOpenGroup((current) =>
                      current === group.label ? null : group.label
                    )
                  }
                >
                  {group.label}
                </button>
                {isOpen ? (
                  <div className="absolute right-0 top-10 z-50 grid min-w-56 gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-xl">
                    {group.links.map(([href, label]) => (
                      <Link
                        key={href}
                        href={href}
                        className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        onClick={() => setOpenGroup(null)}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
