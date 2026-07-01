import Link from "next/link";
import { getPublicTrustProfile } from "@/lib/public-profile/profile";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }
  if (status === "not_found") return "border-zinc-700 text-zinc-300";

  return "border-red-700 text-red-200";
}

function formatDate(value: string | null) {
  if (!value) return "n/a";

  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

export default async function PublicProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = getPublicTrustProfile(id);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/profile", "Public Profiles"],
            ["/verify", "Verify"],
            ["/trust-badges", "Trust Badges"],
            ["/trust-embeds", "Trust Embeds"],
            ["/trust-seal-authority", "Trust Seals"],
            ["/trust-registry", "Trust Registry"],
            ["/verification-receipts", "Verification Receipts"],
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

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
                Public Trust Profile
              </p>
              <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
                {profile.display_name}
              </h1>
              <p className="mt-4 text-zinc-400">{profile.verification_id}</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${statusClass(
                profile.trust_status
              )}`}
            >
              {profile.trust_status}
            </span>
          </div>

          {profile.trust_status === "revoked" ? (
            <div className="mt-6 rounded-lg border border-red-800 bg-black p-4 text-red-200">
              Revocation warning: this public trust profile should not be
              treated as active.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Type", profile.profile_type],
              ["Verification Status", profile.trust_status],
              ["Trust Passport Status", profile.trust_passport_status],
              ["Reality Passport Status", profile.reality_passport_status],
              ["HPI™ Band", profile.human_presence_band],
              ["Origin Trace Band", profile.origin_trace_band],
              ["Trust Score Band", profile.trust_score_band],
              ["Last Verified", formatDate(profile.last_verified_at)],
              ["Issued At", formatDate(profile.issued_at)],
              ["Expires At", formatDate(profile.expires_at)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-lg font-medium text-zinc-100">{value}</p>
              </div>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <h2 className="text-xl font-semibold">Trust Badges</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.verified_badges.length ? (
                profile.verified_badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-emerald-800 px-2.5 py-1 text-xs text-emerald-200"
                  >
                    {badge}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-500">No public badges.</span>
              )}
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h2 className="text-xl font-semibold">Public Summary</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {profile.public_summary}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h2 className="text-xl font-semibold">Safe Evidence Summary</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {profile.safe_evidence_summary}
              </p>
            </div>
          </div>

          <section className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <h2 className="text-xl font-semibold">Public-Safe Ledger Summary</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Recent trust changes can be summarized publicly without exposing
              private evidence, raw audit logs, admin notes or internal scores.
            </p>
            <Link
              href={`/api/ledger/subject/${encodeURIComponent(profile.verification_id)}`}
              className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              View ledger JSON
            </Link>
          </section>

          <section className="mt-6 rounded-lg border border-zinc-800 bg-black p-4">
            <h2 className="text-xl font-semibold">Verification Sources</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {profile.verification_sources_summary}
            </p>
            {profile.public_linkedin_url ? (
              <Link
                href={profile.public_linkedin_url}
                className="mt-4 inline-flex rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:text-white"
              >
                Public LinkedIn
              </Link>
            ) : null}
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/verify/${encodeURIComponent(profile.verification_id)}`}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Verify this profile
            </Link>
            <Link
              href="/trust-recovery"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Request updated verification
            </Link>
            <Link
              href="/passport"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Create your own Trust Passport
            </Link>
            <Link
              href="/trust-embeds"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Embed this trust badge
            </Link>
            <Link
              href="/trust-seal-authority"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              View trust seals
            </Link>
            <Link
              href="/trust-registry"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:text-white"
            >
              Back to Registry
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-zinc-600">
            Private evidence, raw audit logs, admin notes, full internal risk
            scores, full emails, API keys and private files are never exposed on
            public trust profiles.
          </p>
        </section>
      </div>
    </main>
  );
}
