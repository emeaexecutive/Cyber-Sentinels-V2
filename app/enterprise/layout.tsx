import Link from "next/link";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-[#04070c] px-6 py-3 text-white md:px-8">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-zinc-300">Enterprise</span>
          <Link href="/demo" className="text-cyan-200 hover:text-white">View Demo</Link>
          <Link href="/demo/hiring-attack" className="text-cyan-200 hover:text-white">Hiring Attack Demo</Link>
          <Link href="/enterprise/pilot" className="text-cyan-200 hover:text-white">Pilot</Link>
          <Link href="/design-partner" className="text-cyan-200 hover:text-white">Design Partner</Link>
          <Link href="/enterprise-access" className="ml-auto rounded-md bg-white px-3 py-1.5 font-semibold text-black">Request Enterprise Access</Link>
        </nav>
      </div>
      {children}
    </>
  );
}
