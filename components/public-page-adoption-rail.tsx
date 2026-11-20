"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicPageAdoptionFor } from "@/lib/navigation/public-page-adoption";
import { spanishAdoptionFor } from "@/lib/i18n/es-adoption";
import { getSpanishSourcePath, type PublicLocale } from "@/lib/i18n/public-locales";

const purposeBuiltAdoptionRoutes = new Set([
  "/",
  "/enterprise",
  "/enterprise/buyer-documentation",
  "/enterprise/pilot-checklist",
]);

export function PublicPageAdoptionRail({ locale = "en" }: { locale?: PublicLocale }) {
  const pathname = usePathname();
  const sourcePath = getSpanishSourcePath(pathname) ?? pathname;
  const contract = locale === "es" ? spanishAdoptionFor(pathname) : publicPageAdoptionFor(pathname);

  if (!contract || purposeBuiltAdoptionRoutes.has(sourcePath) || sourcePath.startsWith("/resources/agent-security")) return null;

  return (
    <aside aria-label={locale === "es" ? "Siguientes pasos de adopción empresarial" : "Enterprise adoption next steps"} className="border-t border-zinc-800 bg-[#070a0f] px-6 py-8 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <details className="text-sm leading-6 text-zinc-300">
          <summary className="cursor-pointer text-base font-medium text-white">{locale === "es" ? "¿Es adecuado para su equipo?" : "Is this right for your team?"}</summary>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <p className="operational-eyebrow">{locale === "es" ? "A quién se dirige" : "Who this is for"}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{contract.audience}</p>
        </div>
        <div>
          <p className="operational-eyebrow">{locale === "es" ? "Problema que resuelve" : "Problem solved"}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">{contract.problem}</p>
        </div>
        <div>
          <p className="operational-eyebrow">{locale === "es" ? "Por qué Cyber Sentinels" : "Why Cyber Sentinels"}</p>
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
