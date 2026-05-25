import Link from "next/link";
import {
  demoTrustSeals,
  privateSealFieldsNeverExposed,
  publicSafeSealFields,
  trustSealAuditEvents,
  trustSealSignals,
  trustSealStatuses,
  trustSealTypes,
} from "@/lib/public-verification/trustSeals";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review", "suspended"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

export default function TrustSealAuthorityPage() {
  const sections = [
    ["Trust Seal Authority", "Public trust marks issued by Cyber Sentinels."],
    ["Verified Human Seal", "A public-safe seal for verified humans."],
    ["Verified Agent Seal", "AI agent registry and permission trust mark."],
    ["Reality Passport Seal", "Reality Passport status as a public mark."],
    ["HPI Checked Seal", "Human Presence Index verification marker."],
    ["Origin Trace Seal", "Origin Trace and provenance marker."],
    ["Evidence Chain Verified", "Evidence chain integrity seal."],
    ["Candidate Trust Seal", "Candidate trust report seal."],
    ["Marketplace Trust Seal", "Seller, creator and marketplace trust seal."],
    ["Revoked / Expired Seals", "Public warnings for seals that are no longer active."],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/verify", "Public Verify"],
            ["/trust-registry", "Trust Registry"],
            ["/trust-embeds", "Trust Embeds"],
            ["/profile", "Public Profiles"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/client-portal", "Client Portal"],
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
            Public trust mark authority
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Seal Authority&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Cyber Sentinels issues trust marks for a world where reality must be verified.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {demoTrustSeals.map((seal) => (
            <Link
              key={seal.seal_id}
              href={`/seal/${encodeURIComponent(seal.seal_id)}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-500"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Cyber Sentinels Trust Seal
              </p>
              <h2 className="mt-3 text-xl font-semibold">{seal.subject_name}</h2>
              <p className="mt-2 text-sm text-zinc-500">{seal.seal_type}</p>
              <span
                className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClass(
                  seal.status
                )}`}
              >
                {seal.status}
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
            <h2 className="text-xl font-semibold">Registry Listing</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Active, expired and revoked trust seals can be listed in the
              Trust Registry for public-safe discovery and verification.
            </p>
            <Link
              href="/trust-registry"
              className="mt-5 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Registry
            </Link>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Seal Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustSealTypes.map((type) => (
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
            <h2 className="text-xl font-semibold">Seal States</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustSealStatuses.map((status) => (
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

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Public-Safe Fields</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicSafeSealFields.map((field) => (
                <code
                  key={field}
                  className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Never Exposed</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {privateSealFieldsNeverExposed.map((field) => (
                <code
                  key={field}
                  className="rounded-full border border-red-800 px-2.5 py-1 text-xs text-red-200"
                >
                  {field}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Signals / Audit</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {[...trustSealSignals, ...trustSealAuditEvents].map((item) => (
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
