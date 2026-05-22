import Link from "next/link";

const sections = [
  "Metadata integrity",
  "Watermark / SynthID status",
  "C2PA status",
  "Model fingerprint risk",
  "Upload chain evidence",
  "Cross-modal forensic consistency",
  "Creator attribution confidence",
  "Human review required",
];

export default function OriginTracePage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            Attribution confidence
          </p>

          <h1 className="mt-6 max-w-4xl text-5xl font-bold">
            Origin Trace™
          </h1>

          <p className="mt-6 max-w-3xl text-zinc-400">
            Detection tells you if something may be fake. Origin Trace™ asks
            where it may have come from.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="max-w-3xl text-zinc-400">
            Cyber Sentinels uses confidence-based wording: likely source,
            attribution confidence, model fingerprint risk, metadata integrity,
            watermark status, C2PA status and upload chain evidence. It does
            not claim to always identify the creator of a fake.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {sections.map((section) => (
            <div
              key={section}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-lg font-semibold">{section}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Preserve audit-ready evidence while flagging when human review
                is required before permission is granted.
              </p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/deepfake-detection"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Deepfake Detection
          </Link>
          <Link
            href="/reality-passport"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Reality Passport
          </Link>
          <Link
            href="/passport"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Create Passport
          </Link>
        </div>
      </div>
    </main>
  );
}
