import Link from "next/link";

const stages = [
  "Liveness verification",
  "Deepfake video detection",
  "Candidate verification",
  "Verified humans",
];

export default function VideoVerificationPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          Video verification
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          Verify human video, candidate identity and media provenance.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          The platform combines liveness verification, fake image detection,
          cloned voice detection, deepfake video detection and audit logs into a
          Trust Passport workflow built for proof before permission.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          {stages.map((stage) => (
            <div
              key={stage}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-lg font-semibold">{stage}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Feed risk scores into the signals feed, clearances and
                audit-ready records for verified humans and hiring reviews.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
