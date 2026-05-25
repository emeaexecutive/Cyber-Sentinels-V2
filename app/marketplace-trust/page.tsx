import Link from "next/link";
import {
  demoMarketplaceUseCases,
  marketplaceAuditEvents,
  marketplaceSignals,
  marketplaceTrustObjects,
  marketplaceTypes,
  trustBadgeConcepts,
} from "@/lib/marketplace/trustLayer";

export default function MarketplaceTrustPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/trust-badges", "Trust Badges"],
            ["/api-docs", "API Docs"],
            ["/developer-console", "Developer Console"],
            ["/compliance-export", "Compliance Export"],
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
            Platform trust infrastructure
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Marketplace Trust Layer™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Cyber Sentinels prepares external platforms to verify users,
            sellers, candidates, creators, agents, media and high-risk
            interactions.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoMarketplaceUseCases.map((useCase) => (
            <div
              key={useCase.title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{useCase.marketplace_type}</p>
              <h2 className="mt-2 text-xl font-semibold">{useCase.title}</h2>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {useCase.summary}
              </p>
              <code className="mt-4 inline-flex rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200">
                {useCase.recommended_flow}
              </code>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {[
            [
              "Verified Humans",
              "Human Presence Index, liveness and step-up checks for real-user assurance.",
            ],
            [
              "Verified Sellers / Creators",
              "Seller, creator and company trust badges for safer marketplace interactions.",
            ],
            [
              "Verified Candidates",
              "Candidate reports, profile consistency and review trails before interviews.",
            ],
            [
              "Verified AI Agents",
              "Agent registry, permissions and policy status before autonomous actions.",
            ],
            [
              "Deepfake / Media Risk",
              "Reality Passport, Origin Trace and media-risk signals for uploads.",
            ],
            [
              "API Integration",
              "Trust checks, badge verification and report exports for partner platforms.",
            ],
            [
              "Trust Badges",
              "Portable public-safe trust summaries without exposing sensitive evidence.",
            ],
            [
              "Risk Signals",
              "Marketplace checks emit signals for review, revocation and recovery.",
            ],
            [
              "Audit-ready reports",
              "Compliance Export packs support customers, audits and internal review.",
            ],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Marketplace Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {marketplaceTypes.map((type) => (
                <code
                  key={type}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {type}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Trust Objects</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {marketplaceTrustObjects.map((object) => (
                <code
                  key={object}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {object}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals / Audit</h2>
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
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Badge Concepts</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Badge verification returns public-safe trust summaries for
                external platforms.
              </p>
            </div>
            <Link
              href="/trust-badges"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Badges
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {trustBadgeConcepts.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-emerald-800 px-3 py-1 text-xs text-emerald-200"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
