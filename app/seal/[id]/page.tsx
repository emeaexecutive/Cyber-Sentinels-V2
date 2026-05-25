import Link from "next/link";
import { getPublicTrustSeal } from "@/lib/public-verification/trustSeals";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review", "suspended"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seal = getPublicTrustSeal(id);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <section className="mx-auto max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Cyber Sentinels Trust Seal
        </p>
        <h1 className="mt-4 text-4xl font-semibold">{seal.subject_name}</h1>
        <p className="mt-3 text-zinc-500">{seal.seal_id}</p>

        {seal.status === "revoked" ? (
          <div className="mt-6 rounded-lg border border-red-800 bg-black p-4 text-red-200">
            Revoked warning: this trust seal should not be treated as active.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Seal Type", label(seal.seal_type)],
            ["Status", seal.status],
            ["Subject Type", seal.subject_type],
            ["Trust Band", seal.trust_band],
            ["Issued At", seal.issued_at],
            ["Expires At", seal.expires_at ?? "n/a"],
            ["Issuer", seal.issuer],
            ["Revoked At", seal.revoked_at ?? "n/a"],
          ].map(([itemLabel, value]) => (
            <div key={itemLabel} className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-sm text-zinc-500">{itemLabel}</p>
              <p className="mt-2 text-lg font-medium capitalize text-zinc-100">
                {value}
              </p>
            </div>
          ))}
        </div>

        <span
          className={`mt-6 inline-flex rounded-full border px-3 py-1 text-sm ${statusClass(
            seal.status
          )}`}
        >
          {seal.status}
        </span>

        <p className="mt-5 text-sm leading-6 text-zinc-400">
          {seal.public_summary}
        </p>

        <Link
          href={`/api/seals/verify/${encodeURIComponent(seal.seal_id)}`}
          className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          Verification link
        </Link>
      </section>
    </main>
  );
}
