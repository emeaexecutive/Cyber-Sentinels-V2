"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicPageAdoptionFor } from "@/lib/navigation/public-page-adoption";

const purposeBuiltAdoptionRoutes = new Set([
  "/",
  "/enterprise",
  "/enterprise/buyer-documentation",
  "/enterprise/pilot-checklist",
]);

export function PublicPageAdoptionRail() {
  const pathname = usePathname();
  const contract = publicPageAdoptionFor(pathname);

  if (!contract || purposeBuiltAdoptionRoutes.has(pathname) || pathname.startsWith("/resources/agent-security")) return null;

  return (
    <aside aria-label="Enterprise adoption next steps" className="border-t border-zinc-800 bg-[#070a0f] px-6 py-8 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <details className="text-sm leading-6 text-zinc-300">
          <summary className="cursor-pointer text-base font-medium text-white">Is this right for your team?</summary>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <p className="operational-eyebrow">Who this is for</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{contract.audience}</p>
        </div>
        <div>
          <p className="operational-eyebrow">Problem solved</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{contract.problem}</p>
        </div>
        <div>
          <p className="operational-eyebrow">Why Cyber Sentinels</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{contract.differentiation}</p>
        </div>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <Link href={contract.primary.href} className="brand-primary-action text-sm">{contract.primary.label}</Link>
          <Link href={contract.supporting.href} className="inline-flex min-h-11 items-center text-sm text-cyan-200 underline underline-offset-4">{contract.supporting.label}</Link>
        </div>
      </div>
    </aside>
  );
}
