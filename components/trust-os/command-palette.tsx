"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrustOSAccessLevel, TrustOSSearchItem } from "@/lib/trust-os/context";
import { trustOSSearchCatalog } from "@/lib/trust-os/context";

export default function CommandPalette({
  accessLevel,
  onClose,
}: {
  accessLevel: TrustOSAccessLevel;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return trustOSSearchCatalog
      .filter((item) => item.access === "all" || accessLevel === "admin")
      .filter((item) => {
        if (!normalized) return true;
        return [item.label, item.description, item.category, ...item.keywords]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 12);
  }, [accessLevel, query]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setActiveIndex(0), [query]);

  function navigate(item: TrustOSSearchItem) {
    router.push(item.href);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/75 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-label="Enterprise command palette" className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-700 bg-[#080b10] shadow-2xl shadow-black">
        <div className="border-b border-zinc-800 p-4">
          <label htmlFor="trust-os-search" className="sr-only">Search enterprise trust records and destinations</label>
          <input
            ref={inputRef}
            id="trust-os-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (results.length) setActiveIndex((current) => Math.min(current + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" && results[activeIndex]) navigate(results[activeIndex]);
            }}
            placeholder="Search humans, agents, evidence, Replay, governance…"
            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-base text-white placeholder:text-zinc-500"
          />
          <p className="mt-2 text-xs text-zinc-500">Search and navigate existing protected records. Results remain constrained by route authorization and RLS.</p>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {results.length ? results.map((item, index) => (
            <button
              key={`${item.category}-${item.label}`}
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => navigate(item)}
              className={`grid w-full grid-cols-[auto_1fr] gap-3 rounded-lg px-3 py-3 text-left ${index === activeIndex ? "bg-cyan-950/35" : "hover:bg-zinc-900"}`}
            >
              <span className="mt-0.5 rounded border border-zinc-700 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-cyan-200">{item.category}</span>
              <span>
                <span className="block text-sm font-semibold text-zinc-100">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.description}</span>
              </span>
            </button>
          )) : (
            <p className="p-6 text-center text-sm text-zinc-400">No existing destination matches this search.</p>
          )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
          <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
          <span>↑↓ select · Enter open · Esc close</span>
        </footer>
      </section>
    </div>
  );
}
