"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deriveTrustOSContext, type TrustOSAccessLevel } from "@/lib/trust-os/context";

const CommandPalette = dynamic(() => import("@/components/trust-os/command-palette"));

export type TrustOSStatus = "healthy" | "degraded" | "blocked" | "unknown";
export type TrustOSStatusItem = {
  label: string;
  status: TrustOSStatus;
  href: string;
  boundary?: string;
};

const baseAreas = [
  ["Overview", "/dashboard"],
  ["Operations", "/workspace"],
  ["Trust", "/trust-center"],
  ["Runtime", "/dashboard/session-integrity"],
  ["Governance", "/dashboard/governance"],
] as const;

function statusLabel(status: TrustOSStatus) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Review";
  if (status === "blocked") return "Blocked";
  return "Awaiting data";
}

function statusClass(status: TrustOSStatus) {
  if (status === "healthy") return "border-emerald-800 text-emerald-200";
  if (status === "degraded") return "border-amber-800 text-amber-200";
  if (status === "blocked") return "border-red-800 text-red-200";
  return "border-zinc-700 text-zinc-400";
}

export function EnterpriseTrustOSShell({
  accessLevel,
  status,
  children,
}: {
  accessLevel: TrustOSAccessLevel;
  status: TrustOSStatusItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const context = useMemo(() => deriveTrustOSContext(pathname, accessLevel), [accessLevel, pathname]);
  const areas = accessLevel === "admin"
    ? [...baseAreas, ["Providers", "/admin/provider-status"] as const, ["Administration", "/admin/access"] as const]
    : [...baseAreas, ["Providers", "/trust-center#providers"] as const, ["Administration", "/team-access"] as const];

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => setPaletteOpen(false), [pathname]);

  return (
    <div className="trust-os-shell">
      <aside className="trust-os-sidebar" aria-label="Enterprise workspace areas">
        <div>
          <p className="operational-eyebrow">Enterprise Trust OS</p>
          <p className="mt-2 text-sm font-semibold text-white">Operating Workspace</p>
        </div>
        <nav className="mt-5 grid gap-1">
          {areas.map(([label, href]) => {
            const baseHref = href.split("#")[0];
            const active = baseHref === "/dashboard" ? pathname === baseHref : pathname === baseHref || pathname.startsWith(`${baseHref}/`);
            return <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`trust-os-area-link ${active ? "trust-os-area-link-active" : ""}`}>{label}</Link>;
          })}
        </nav>
        <button type="button" onClick={() => setPaletteOpen(true)} className="mt-6 flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-black px-3 py-2.5 text-left text-sm text-zinc-300 hover:border-cyan-800 hover:text-white">
          <span>Search & commands</span><kbd className="rounded border border-zinc-700 px-1.5 py-0.5 text-xs text-zinc-500">Ctrl K</kbd>
        </button>
        <Link href="/notifications" className="mt-2 block rounded-lg border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 hover:border-cyan-900 hover:text-white">Notification Center</Link>
      </aside>

      <div className="min-w-0 flex-1">
        <nav aria-label="Mobile enterprise workspace areas" className="flex gap-2 overflow-x-auto border-b border-zinc-800 bg-[#080b10] px-4 py-3 lg:hidden">
          {areas.map(([label, href]) => <Link key={label} href={href} className="whitespace-nowrap rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200">{label}</Link>)}
          <button type="button" onClick={() => setPaletteOpen(true)} className="whitespace-nowrap rounded-lg border border-cyan-900 px-3 py-2 text-sm text-cyan-100">Search · Ctrl K</button>
        </nav>

        <section aria-label="Global trust context" className="border-b border-zinc-800 bg-black px-4 py-3 md:px-6">
          <div className="mx-auto grid max-w-[96rem] gap-2 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ["Current Enterprise", context.enterprise],
              ["Current Workflow", context.workflow],
              ["Current Entity", context.entity],
              ["Current Trust Posture", context.trustPosture],
              ["Current Authority", context.authority],
              ["Current Replay", context.replay],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</p>
                <p className="mt-1 truncate text-xs font-medium text-zinc-200" title={value}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Enterprise platform status" className="border-b border-zinc-800 bg-[#080b10] px-4 py-2.5 md:px-6">
          <div className="mx-auto flex max-w-[96rem] gap-2 overflow-x-auto">
            {status.map((item) => (
              <Link key={item.label} href={item.href} title={item.boundary} className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${statusClass(item.status)}`}>
                <span className="font-semibold">{item.label}</span> · {statusLabel(item.status)}
              </Link>
            ))}
          </div>
        </section>

        <div className="trust-os-content">{children}</div>
      </div>

      {paletteOpen ? <CommandPalette accessLevel={accessLevel} onClose={() => setPaletteOpen(false)} /> : null}
    </div>
  );
}
