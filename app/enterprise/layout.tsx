import Link from "next/link";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-[#04070c] px-6 py-3 text-white md:px-8">
        <nav aria-label="Enterprise navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="font-semibold uppercase tracking-[0.12em] text-cyan-100">Enterprise</span>
          <Link href="/enterprise" className="text-zinc-300 hover:text-white">Overview</Link>
          <Link href="/enterprise/pilot" className="text-zinc-300 hover:text-white">Pilot Program</Link>
          <Link href="/enterprise/control-plane" className="text-zinc-300 hover:text-white">Control Plane</Link>
          <Link href="/enterprise/auditability" className="text-zinc-300 hover:text-white">Auditability</Link>
          <Link href="/enterprise/readiness" className="text-zinc-300 hover:text-white">Readiness</Link>
          <Link href="/enterprise/compliance" className="text-zinc-300 hover:text-white">Compliance</Link>
          <Link href="/design-partner" className="text-zinc-300 hover:text-white">Design Partner</Link>
          <Link href="/enterprise-access" className="brand-secondary-action ml-auto min-h-9 px-3 py-1.5 text-sm">Enterprise Access</Link>
        </nav>
      </div>
      {children}
    </>
  );
}
