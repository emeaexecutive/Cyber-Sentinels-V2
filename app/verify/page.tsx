import Link from "next/link";
import {
  demoPublicVerifications,
  publicVerificationObjects,
  publicVerificationStatuses,
} from "@/lib/public-verification/verify";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }
  if (["revoked", "expired"].includes(status)) return "border-red-700 text-red-200";

  return "border-zinc-700 text-zinc-300";
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/profile", "Public Profiles"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-embeds", "Trust Embeds"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/api-docs", "API Docs"],
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
            Public verification
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Verify Cyber Sentinels Trust
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Check whether a trust badge, passport or report is currently
            active, expired, revoked or under review.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Verification Lookup</h2>
          <form action="/verify/badge-verified-human" className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="id"
              placeholder="Verification ID / Badge ID / Passport ID"
              className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none"
            />
            <button className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
              Check verification
            </button>
          </form>
          <p className="mt-3 text-sm text-zinc-500">
            V1 examples link directly below while signed verification IDs are
            prepared.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Seal Verification</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Verify Cyber Sentinels trust seals through public-safe seal
                pages or the seal verification API.
              </p>
            </div>
            <Link
              href="/trust-seal-authority"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seals
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Shareable Verification Widgets</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Trust Embeds carry public-safe badge status into websites,
                marketplaces, email signatures and Carrd pages.
              </p>
            </div>
            <Link
              href="/trust-embeds"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Embeds
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Public Trust Profiles</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Share public-safe trust pages for verified humans, candidates,
                AI agents, companies and creators.
              </p>
            </div>
            <Link
              href="/profile"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Public Profiles
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {demoPublicVerifications.map((item) => (
            <Link
              key={item.verification_id}
              href={`/verify/${encodeURIComponent(item.verification_id)}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-500"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">
                    {item.verification_object}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {item.subject_name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    item.verification_status
                  )}`}
                >
                  {item.verification_status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {item.public_summary}
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Public Verification Objects</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicVerificationObjects.map((object) => (
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
            <h2 className="text-xl font-semibold">Verification Statuses</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicVerificationStatuses.map((status) => (
                <span
                  key={status}
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    status
                  )}`}
                >
                  {status}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
