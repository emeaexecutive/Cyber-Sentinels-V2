import Link from "next/link";
import {
  feedObjectTypes,
  feedStatuses,
  getPublicTrustFeed,
  trustFeedAuditEvents,
  trustFeedSignals,
  type TrustFeedItem,
} from "@/lib/trust-feed/feed";

function statusClass(status: string) {
  if (["active", "verified", "renewed"].includes(status)) {
    return "border-emerald-700 text-emerald-200";
  }
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function FeedList({ title, items }: { title: string; items: TrustFeedItem[] }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <Link
              key={`${title}-${item.id}`}
              href={item.public_link}
              className="block rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-100">{item.event}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.subject_name} / {item.subject_type}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                {item.trust_band} trust band / {formatTime(item.created_at)}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No public-safe activity yet.</p>
        )}
      </div>
    </section>
  );
}

export default function TrustFeedPage() {
  const feed = getPublicTrustFeed();
  const newProfiles = feed.filter((item) => item.subject_type === "public_profile");
  const recentBadges = feed.filter((item) => item.subject_type === "trust_badge");
  const agentActivity = feed.filter((item) => item.subject_type === "ai_agent");
  const marketplaceEvents = feed.filter(
    (item) => item.subject_type === "marketplace_event"
  );
  const trustUpdates = feed.filter((item) =>
    ["reality_passport", "human_presence", "origin_trace"].includes(
      item.subject_type
    )
  );
  const verificationActivity = feed.filter((item) =>
    ["verification", "verifier_activity"].includes(item.subject_type)
  );

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/profile", "Public Profiles"],
            ["/verify", "Public Verify"],
            ["/marketplace-trust", "Marketplace Trust"],
            ["/mission-control", "Mission Control"],
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
            Network activity
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Trust Feed™
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Trust activity across the Cyber Sentinels network.
          </p>
        </section>

        <section className="mt-8 grid gap-3 md:grid-cols-3">
          {[
            ["Public items", feed.length],
            ["Verified updates", feed.filter((item) => item.status === "verified").length],
            ["Active links", feed.filter((item) => item.status === "active").length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <FeedList title="Live Trust Activity" items={feed} />
          <div className="space-y-6">
            <FeedList title="New Profiles" items={newProfiles} />
            <FeedList title="Recent Badges" items={recentBadges} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-4">
          <FeedList title="Agent Activity" items={agentActivity} />
          <FeedList title="Marketplace Events" items={marketplaceEvents} />
          <FeedList title="Trust Updates" items={trustUpdates} />
          <FeedList title="Public Verification Activity" items={verificationActivity} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Feed Object Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {feedObjectTypes.map((type) => (
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
              {feedStatuses.map((status) => (
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
              {[...trustFeedSignals, ...trustFeedAuditEvents].map((item) => (
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
      </div>
    </main>
  );
}
