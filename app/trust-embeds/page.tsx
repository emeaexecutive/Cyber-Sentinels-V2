import Link from "next/link";
import {
  demoTrustEmbeds,
  privateEmbedFieldsNeverExposed,
  publicSafeEmbedFields,
  trustEmbedAuditEvents,
  trustEmbedSignals,
  trustEmbedStatuses,
  trustEmbedTypes,
} from "@/lib/public-verification/embeds";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

export default function TrustEmbedsPage() {
  const sections = [
    ["Embed Gallery", "Profiles, websites, marketplaces, email signatures and Carrd pages."],
    ["Verified Human Badge", "Public-safe human trust proof."],
    ["Verified Agent Badge", "Agent registry and permission status summary."],
    ["Reality Passport Badge", "Reality Passport status without private evidence."],
    ["HPI Checked", "Human Presence Index band summary."],
    ["Origin Trace Checked", "Origin verification summary."],
    ["Candidate Trust Report", "Hiring-safe candidate report badge."],
    ["Marketplace Trust Badge", "Seller, creator and company trust summary."],
    ["Embed Code Placeholder", "Replace YOUR_DOMAIN with the production domain."],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/verify", "Public Verify"],
            ["/profile", "Public Profiles"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-registry", "Trust Registry"],
            ["/trust-seal-authority", "Trust Seal Authority"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/developer-console", "Developer Console"],
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
            Public-safe widgets
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Embeds&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Carry proof before permission across the web.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {demoTrustEmbeds.map((embed) => (
            <Link
              key={embed.verification_id}
              href={`/embed/${encodeURIComponent(embed.verification_id)}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-500"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Cyber Sentinels
              </p>
              <h2 className="mt-3 text-xl font-semibold">{embed.subject_name}</h2>
              <p className="mt-2 text-sm text-zinc-500">{embed.badge_type}</p>
              <span
                className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClass(
                  embed.status
                )}`}
              >
                {embed.status}
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(([title, copy]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Registry Lookup</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Embed publishers can look up public-safe registry entries before
              choosing a badge, seal or profile widget.
            </p>
            <Link
              href="/trust-registry"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Registry
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Seal Widgets</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Trust Seal Authority can power compact seal widgets for public
              trust marks alongside profile and badge embeds.
            </p>
            <Link
              href="/trust-seal-authority"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seal Authority
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Embed Code Placeholder</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Replace YOUR_DOMAIN with the production domain before publishing.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
{`<iframe src="https://YOUR_DOMAIN/embed/demo-verified-human"></iframe>

<script src="https://YOUR_DOMAIN/api/embed.js"></script>`}
            </pre>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Public-Safe Fields</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicSafeEmbedFields.map((field) => (
                <code
                  key={field}
                  className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                >
                  {field}
                </code>
              ))}
            </div>
            <h3 className="mt-6 text-lg font-semibold">Never Exposed</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {privateEmbedFieldsNeverExposed.map((field) => (
                <code
                  key={field}
                  className="rounded-full border border-red-800 px-2.5 py-1 text-xs text-red-200"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Embed Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustEmbedTypes.map((type) => (
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
            <h2 className="text-xl font-semibold">Badge States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustEmbedStatuses.map((status) => (
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

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals / Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {[...trustEmbedSignals, ...trustEmbedAuditEvents].map((item) => (
                <code
                  key={item}
                  className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200"
                >
                  {item}
                </code>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
