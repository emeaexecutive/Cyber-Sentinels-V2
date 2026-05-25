import Link from "next/link";
import {
  demoTrustBadges,
  marketplaceAuditEvents,
  marketplaceSignals,
  trustBadgeConcepts,
  trustBadgeStates,
} from "@/lib/marketplace/trustLayer";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["revoked", "expired"].includes(status)) return "border-red-700 text-red-200";

  return "border-amber-700 text-amber-200";
}

export default function TrustBadgesPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/developer-console", "Developer Console"],
            ["/client-portal", "Client Portal"],
            ["/team-workspace", "Team Workspace"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Public-safe verification
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Badges
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Badge examples and states for humans, agents, media, evidence and
            marketplace interactions.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {demoTrustBadges.map((badge) => (
            <div
              key={badge.badge_id}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{badge.subject_type}</p>
                  <h2 className="mt-2 text-xl font-semibold">{badge.label}</h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    badge.badge_status
                  )}`}
                >
                  {badge.badge_status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {badge.verification_summary}
              </p>
              <p className="mt-4 text-3xl font-semibold">{badge.trust_score}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Badge Concepts</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustBadgeConcepts.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Badge States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustBadgeStates.map((state) => (
                <span
                  key={state}
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    state
                  )}`}
                >
                  {state}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Badge API</h2>
            <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-4">
              <span className="rounded-full border border-emerald-700 px-2.5 py-1 text-xs text-emerald-200">
                POST
              </span>
              <code className="ml-3 text-sm text-zinc-300">
                /api/badges/verify
              </code>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Returns badge status, trust score, summary and expiry without
                exposing sensitive evidence.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Signals / Audit Logs</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {[...marketplaceSignals, ...marketplaceAuditEvents].map((item) => (
              <code
                key={item}
                className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
              >
                {item}
              </code>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
