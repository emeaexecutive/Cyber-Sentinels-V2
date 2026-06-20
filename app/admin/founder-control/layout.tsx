import Link from "next/link";

export default function FounderControlLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-black px-6 py-3 text-white">
        <nav className="mx-auto flex max-w-7xl flex-wrap gap-4 text-sm">
          <span className="font-semibold text-zinc-300">Founder Demo Shortcuts</span>
          <Link href="/demo" className="text-cyan-200">Demo Overview</Link>
          <Link href="/demo/hiring-attack" className="text-cyan-200">Hiring Attack</Link>
          <Link href="/demo/session-integrity" className="text-cyan-200">Session Integrity</Link>
        </nav>
      </div>
      {children}
    </>
  );
}
