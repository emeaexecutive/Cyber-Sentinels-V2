import Link from "next/link";
import {
  demoTrustRegistryEntries,
  privateRegistryFieldsNeverExposed,
  publicSafeRegistryFields,
  trustRegistryAuditEvents,
  trustRegistryObjectTypes,
  trustRegistrySignals,
  trustRegistryStatuses,
} from "@/lib/public-verification/trustRegistry";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review", "suspended"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

export default function TrustRegistryPage() {
  const sections = [
    ["Registry Search", "Search by name, verification ID, seal ID or profile type."],
    ["Verified Humans", "Public-safe verified human records."],
    ["Verified AI Agents", "Agent records connected to registry and permission status."],
    ["Verified Companies", "Company trust records and seals."],
    ["Reality Passports", "Reality Passport discovery and verification links."],
    ["Trust Seals", "Cyber Sentinels seal listings and warning states."],
    ["Recently Verified", "Recent active entries in the public trust layer."],
    ["Revoked / Expired Warning", "Inactive entries remain listed for public safety."],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/verify", "Public Verify"],
            ["/profile", "Public Profiles"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/trust-embeds", "Trust Embeds"],
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
            Public trust discovery
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Registry&trade;
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Search the public trust layer.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-xl font-semibold">Registry Search</h2>
          <form action="/api/registry/search" className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px_auto]">
            <input
              name="query"
              placeholder="Search by name, verification ID, seal ID or profile type"
              className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none"
            />
            <select
              name="type"
              className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none"
              defaultValue="all"
            >
              <option value="all">All types</option>
              {trustRegistryObjectTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-zinc-200">
              Search registry
            </button>
          </form>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demoTrustRegistryEntries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.public_verify_url}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-500"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{entry.object_type}</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {entry.display_name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    entry.status
                  )}`}
                >
                  {entry.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {entry.summary}
              </p>
              <p className="mt-4 text-xs text-zinc-600">
                Last verified: {entry.last_verified_at ?? "n/a"}
              </p>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Object Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustRegistryObjectTypes.map((type) => (
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
            <h2 className="text-xl font-semibold">Statuses</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustRegistryStatuses.map((status) => (
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
              {[...trustRegistrySignals, ...trustRegistryAuditEvents].map((item) => (
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

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Public-Safe Fields</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicSafeRegistryFields.map((field) => (
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
              {privateRegistryFieldsNeverExposed.map((field) => (
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
      </div>
    </main>
  );
}
