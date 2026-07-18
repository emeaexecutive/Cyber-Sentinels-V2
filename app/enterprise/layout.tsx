import Link from "next/link";
import { enterpriseCtas, enterpriseNavigation } from "@/lib/enterprise-experience";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-[#04070c] px-6 py-3 text-white md:px-8">
        <nav aria-label="Enterprise navigation" className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="font-semibold uppercase tracking-[0.12em] text-cyan-100">Enterprise</span>
          {enterpriseNavigation.map((item) => (
            <Link key={item.href} href={item.href} className="text-zinc-300 hover:text-white">{item.label}</Link>
          ))}
          <Link href={enterpriseCtas.requestDemo.href} className="brand-primary-action min-h-9 w-full px-3 py-1.5 text-sm sm:ml-auto sm:w-auto">
            {enterpriseCtas.requestDemo.label}
          </Link>
        </nav>
      </div>
      {children}
    </>
  );
}
