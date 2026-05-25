import Link from "next/link";
import {
  demoPublicProfiles,
  publicProfileStatuses,
  publicProfileTypes,
} from "@/lib/public-profile/profile";
import { getPublicTrustFeed } from "@/lib/trust-feed/feed";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

export default function PublicProfilesPage() {
  const recentActivity = getPublicTrustFeed(4);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/verify", "Public Verify"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-embeds", "Trust Embeds"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/passport", "Create Passport"],
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
            Shareable trust
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Public Trust Profiles
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Share trust without exposing private evidence.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {demoPublicProfiles.map((profile) => (
            <Link
              key={profile.verification_id}
              href={`/profile/${encodeURIComponent(profile.verification_id)}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-500"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-zinc-500">{profile.profile_type}</p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {profile.display_name}
                  </h2>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
                    profile.trust_status
                  )}`}
                >
                  {profile.trust_status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                {profile.public_summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.verified_badges.slice(0, 2).map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Profile Types</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {publicProfileTypes.map((type) => (
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
              {publicProfileStatuses.map((status) => (
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

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Trust Seals</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Public profiles can show Cyber Sentinels trust seals for
                verified humans, agents, companies, candidates and media.
              </p>
            </div>
            <Link
              href="/trust-seal-authority"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Seal Authority
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Embed this trust badge</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Public profiles can publish a compact Trust Embed without
                exposing private evidence, admin notes or internal risk scores.
              </p>
            </div>
            <Link
              href="/trust-embeds"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Embeds
            </Link>
          </div>
          <code className="mt-5 block rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
            {`<iframe src="https://YOUR_DOMAIN/embed/demo-verified-human"></iframe>`}
          </code>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Public-safe trust activity connected to profiles and badges.
              </p>
            </div>
            <Link
              href="/trust-feed"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              Open Trust Feed
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recentActivity.map((item) => (
              <Link
                key={item.id}
                href={item.public_link}
                className="rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-500"
              >
                <p className="font-medium text-zinc-100">{item.event}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  {item.subject_name} / {item.status}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
