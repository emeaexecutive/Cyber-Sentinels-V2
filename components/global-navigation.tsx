import Link from "next/link";

const navGroups = [
  {
    label: "Start",
    links: [
      ["/", "Home"],
      ["/how-to-use", "How to Use"],
      ["/passport", "Create Passport"],
    ],
  },
  {
    label: "Trust Operations",
    links: [
      ["/passports", "Trust Passports"],
      ["/verification-queue", "Verification Queue"],
      ["/evidence-vault", "Evidence Vault"],
      ["/back-office", "Back Office"],
    ],
  },
  {
    label: "Intelligence",
    links: [
      ["/trust-intelligence", "Trust Intelligence"],
      ["/trust-graph-engine", "Trust Graph"],
      ["/trust-assistant", "Trust Assistant"],
    ],
  },
  {
    label: "Governance",
    links: [
      ["/workforce-trust", "Workforce Trust"],
      ["/intent-verification", "Intent Verification"],
      ["/autonomy-governance", "Autonomy Governance"],
      ["/execution-passports", "Execution Passports"],
      ["/state-verification", "State Verification"],
    ],
  },
  {
    label: "Support & Legal",
    links: [
      ["/help", "Help"],
      ["/knowledge-base", "Knowledge Base"],
      ["/security", "Security"],
      ["/data-rights", "Data Rights"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
      ["/cookies", "Cookies"],
      ["/legal", "Legal"],
      ["/regulatory", "Regulatory"],
      ["/accessibility", "Accessibility"],
      ["/about", "About"],
      ["/careers", "Careers"],
      ["/media-centre", "Media Centre"],
      ["/modern-slavery", "Modern Slavery"],
      ["/sustainability", "Sustainability"],
    ],
  },
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
          {navGroups.map((group) => (
            <details key={group.label} className="group relative">
              <summary className="cursor-pointer list-none rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 hover:border-cyan-500/70 hover:text-white">
                {group.label}
              </summary>
              <div className="absolute right-0 top-10 z-50 hidden min-w-56 gap-1 rounded-lg border border-zinc-800 bg-black p-2 shadow-xl group-open:grid">
                {group.links.map(([href, label]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </div>
    </header>
  );
}
