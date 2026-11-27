"use client";

import { usePathname } from "next/navigation";
import type { ConsentCategoryDefinition } from "@/src/lib/consent/types";
import { consentText, localizedConsentCategory, type ConsentLocale, useConsentLocale } from "@/src/lib/consent/localization";

export function ConsentProviderList({
  categories,
  locale: initialLocale,
}: {
  categories: ConsentCategoryDefinition[];
  locale?: ConsentLocale;
}) {
  const pathname = usePathname();
  const routeLocale = pathname?.startsWith("/es/") || pathname === "/es" ? "es" : "en";
  const locale = useConsentLocale(pathname ?? undefined, initialLocale ?? routeLocale);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {categories.map((category) => {
        const copy = localizedConsentCategory(locale, category);
        const party = locale === "es"
          ? copy.party
          : category.party === "FIRST_PARTY"
            ? consentText(locale, "firstParty", "First party")
            : consentText(locale, "firstAndThirdParty", "First and third party");

        return (
          <article key={category.key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-white">{copy.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">{copy.description}</p>
            <dl className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
              <div><dt className="text-zinc-300">{consentText(locale, "purpose", "Purpose")}</dt><dd>{copy.purposes.join(", ")}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "legalBasis", "Legal basis")}</dt><dd>{copy.legalBasis}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "providers", "Providers")}</dt><dd>{copy.providers.join(", ")}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "storage", "Storage")}</dt><dd>{copy.storageItems.join(", ")}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "retention", "Retention")}</dt><dd>{copy.retention}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "classification", "Classification")}</dt><dd>{party} · {category.required ? consentText(locale, "required", "Required") : consentText(locale, "optional", "Optional")}</dd></div>
              <div><dt className="text-zinc-300">{consentText(locale, "lastUpdated", "Last updated")}</dt><dd>{category.lastUpdated}</dd></div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
