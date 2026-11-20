"use client";
import { useEffect, useState, type ReactNode } from "react";

export function PublicDisclosure({ id, title, children, defaultOpen = false }: {
  id: string; title: ReactNode; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const reveal = () => { if (window.location.hash === `#${id}`) setOpen(true); };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [id]);
  return <details id={id} open={open} onToggle={event => setOpen(event.currentTarget.open)}
    className="scroll-mt-32 rounded-xl border border-zinc-800 bg-black/40 p-5">
    <summary className="cursor-pointer text-xl font-semibold leading-8 text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
      <h2 className="inline">{title}</h2>
    </summary>
    <div className="mt-4">{children}</div>
  </details>;
}
