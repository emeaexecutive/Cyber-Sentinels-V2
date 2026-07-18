import Link from "next/link";

export function EnterpriseBreadcrumbs({ current }: { current: string }) {
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
        <li aria-current="page" className="font-semibold text-zinc-100">
          {current}
        </li>
      </ol>
    </nav>
  );
}
