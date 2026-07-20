"use client";

import type { ConsentCategoryDefinition } from "@/src/lib/consent/types";

export function ConsentCategory({ category, enabled, onChange }: { category: ConsentCategoryDefinition; enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-black/60 p-4" aria-labelledby={`consent-category-${category.key}`}>
      <div className="flex items-start justify-between gap-5">
        <div><h3 id={`consent-category-${category.key}`} className="font-semibold text-white">{category.name}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{category.description}</p></div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-200">
          <span>{category.required ? "Always enabled" : enabled ? "Enabled" : "Disabled"}</span>
          <input type="checkbox" role="switch" aria-label={`${category.name} consent`} checked={category.required || enabled} disabled={category.required} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-cyan-400" />
        </label>
      </div>
      <dl className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
        <div><dt className="text-zinc-300">Purpose</dt><dd>{category.purposes.join(", ")}</dd></div><div><dt className="text-zinc-300">Legal basis</dt><dd>{category.legalBasis}</dd></div>
        <div><dt className="text-zinc-300">Providers</dt><dd>{category.providers.join(", ")}</dd></div><div><dt className="text-zinc-300">Storage</dt><dd>{category.storageItems.join(", ")}</dd></div>
        <div><dt className="text-zinc-300">Retention</dt><dd>{category.retention}</dd></div><div><dt className="text-zinc-300">Classification</dt><dd>{category.party.replaceAll("_", " ")} · {category.required ? "Required" : "Optional"}</dd></div>
        <div><dt className="text-zinc-300">Last updated</dt><dd>{category.lastUpdated}</dd></div>
      </dl>
    </section>
  );
}
