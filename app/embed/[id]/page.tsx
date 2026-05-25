import Link from "next/link";
import { getPublicTrustEmbed } from "@/lib/public-verification/embeds";

function statusClass(status: string) {
  if (status === "active") return "border-emerald-700 text-emerald-200";
  if (["pending", "under_review"].includes(status)) {
    return "border-amber-700 text-amber-200";
  }

  return "border-red-700 text-red-200";
}

function badgeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function EmbedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const embed = getPublicTrustEmbed(id);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Cyber Sentinels
        </p>
        <h1 className="mt-4 text-2xl font-semibold">{embed.subject_name}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {badgeLabel(embed.badge_type)} / {embed.subject_type}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(
              embed.status
            )}`}
          >
            {embed.status}
          </span>
          <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
            {embed.trust_band}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {[
            ["Verification ID", embed.verification_id],
            ["Issued", embed.issued_at],
            ["Expires", embed.expires_at ?? "n/a"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-black p-3">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-sm text-zinc-200">{value}</p>
            </div>
          ))}
        </div>

        <Link
          href={embed.public_verify_url}
          className="mt-5 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          Verify link
        </Link>
      </section>
    </main>
  );
}
