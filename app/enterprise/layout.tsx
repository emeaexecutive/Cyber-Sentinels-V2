import Link from "next/link";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-[#04070c] px-6 py-3 text-white md:px-8">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-zinc-300">Enterprise</span>
          <Link href="/enterprise" className="text-zinc-300 hover:text-white">Overview</Link>
          <Link href="/enterprise/pilot" className="text-zinc-300 hover:text-white">Pilot Program</Link>
          <Link href="/design-partner" className="text-zinc-300 hover:text-white">Design Partner</Link>
          <Link href="/enterprise-access" className="ml-auto rounded-md border border-zinc-700 px-3 py-1.5 font-semibold text-zinc-100 hover:border-cyan-500">Enterprise Access</Link>
        </nav>
      </div>
      {children}
    </>
  );
}
