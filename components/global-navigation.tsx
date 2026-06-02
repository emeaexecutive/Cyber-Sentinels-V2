import Link from "next/link";

const navLinks = [
  ["/", "Home"],
  ["/passport", "Create Passport"],
  ["/passports", "Trust Passports"],
  ["/workforce-trust", "Workforce Trust"],
  ["/intent-verification", "Intent Verification"],
  ["/state-verification", "State Verification"],
  ["/autonomy-governance", "Autonomy Governance"],
  ["/execution-passports", "Execution Passports"],
  ["/trust-graph-engine", "Trust Graph"],
  ["/trust-assistant", "Trust Assistant"],
  ["/knowledge-base", "Knowledge Base"],
  ["/help", "Help"],
  ["/verification-queue", "Verification Queue"],
  ["/evidence-vault", "Evidence Vault"],
  ["/mission-control", "Mission Control"],
  ["/back-office", "Back Office"],
];

export function GlobalNavigation() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-[#04070c]/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
        >
          Cyber Sentinels
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-xs text-zinc-300">
          {navLinks.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 hover:border-cyan-500/70 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
