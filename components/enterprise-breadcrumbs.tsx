import Link from "next/link";
import type { EnterpriseAction } from "@/lib/enterprise-experience";

export function EnterpriseBreadcrumbs({ current, parent }: { current: string; parent?: EnterpriseAction }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-400">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="rounded-sm hover:text-white focus-visible:text-white">
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="text-zinc-600">/</li>
        <li>
          <Link href="/enterprise" className="rounded-sm hover:text-white focus-visible:text-white">
            Enterprise
          </Link>
        </li>
        <li aria-hidden="true" className="text-zinc-600">/</li>
        {parent ? (
          <>
            <li>
              <Link href={parent.href} className="rounded-sm hover:text-white focus-visible:text-white">
                {parent.label}
              </Link>
            </li>
            <li aria-hidden="true" className="text-zinc-600">/</li>
          </>
        ) : null}
        <li aria-current="page" className="min-w-0 break-words font-semibold text-zinc-100">
          {current}
        </li>
      </ol>
    </nav>
  );
}
