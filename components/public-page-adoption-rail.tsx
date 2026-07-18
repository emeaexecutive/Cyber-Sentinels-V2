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

  if (!contract || purposeBuiltAdoptionRoutes.has(pathname)) return null;

  return (
    <aside aria-label="Enterprise adoption next steps" className="border-t border-zinc-800 bg-[#070a0f] px-6 py-8 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-center">
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
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link href={contract.primary.href} className="brand-primary-action text-sm">{contract.primary.label}</Link>
          <Link href={contract.supporting.href} className="brand-secondary-action text-sm">{contract.supporting.label}</Link>
        </div>
      </div>
    </aside>
  );
}
