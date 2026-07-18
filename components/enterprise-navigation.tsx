"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { enterpriseCtas, enterpriseNavigation } from "@/lib/enterprise-experience";

export function EnterpriseNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Enterprise navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <Link href="/enterprise" className="font-semibold uppercase tracking-[0.12em] text-cyan-100">
        Enterprise
      </Link>
      {enterpriseNavigation.map((item) => {
        const itemPath = item.href.split("#", 1)[0];
        const active = pathname === itemPath || (itemPath !== "/enterprise" && pathname.startsWith(`${itemPath}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "font-semibold text-white underline decoration-cyan-400 underline-offset-4" : "text-zinc-300 hover:text-white"}
          >
            {item.label}
          </Link>
        );
      })}
      <Link href={enterpriseCtas.requestDemo.href} className="brand-primary-action min-h-11 w-full px-3 py-1.5 text-sm sm:ml-auto sm:w-auto">
        {enterpriseCtas.requestDemo.label}
      </Link>
    </nav>
  );
}
