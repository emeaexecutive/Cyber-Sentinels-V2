import Link from "next/link";
import { getPublicVerification } from "@/lib/public-verification/verify";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }
  if (["revoked", "expired"].includes(status)) return "border-red-700 text-red-200";

  return "border-zinc-700 text-zinc-300";
}

function formatDate(value: string | null) {
  if (!value) return "n/a";

  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

export default async function VerifyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const verification = getPublicVerification(id);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/verify", "Verify"],
            ["/trust-badges", "Trust Badges"],
            ["/marketplace-trust", "Marketplace Trust"],
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
                Verification Status
              </p>
              <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
                {verification.subject_name}
              </h1>
              <p className="mt-4 text-zinc-400">
                {verification.verification_id}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${statusClass(
                verification.verification_status
              )}`}
            >
              {verification.verification_status}
            </span>
          </div>

          {verification.verification_status === "revoked" ? (
            <div className="mt-6 rounded-lg border border-red-800 bg-black p-4 text-red-200">
              Revocation Warning: this public verification is revoked and should
              not be treated as active trust.
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Subject Type", verification.subject_type],
              ["Trust Score Band", verification.trust_score_band],
              ["Badge / Passport Type", verification.verification_object],
              ["Issued At", formatDate(verification.issued_at)],
              ["Expires At", formatDate(verification.expires_at)],
              ["Issuer", verification.issuer],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-sm text-zinc-500">{label}</p>
                <p className="mt-2 text-lg font-medium text-zinc-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h2 className="text-xl font-semibold">Public Summary</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {verification.public_summary}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <h2 className="text-xl font-semibold">Safe Evidence Summary</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {verification.evidence_summary_safe}
              </p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-6 text-zinc-600">
            Private evidence, admin notes, raw files, private audit logs, full
            emails, secret API keys and internal risk details are never exposed
            on public verification pages.
          </p>
        </section>
      </div>
    </main>
  );
}
