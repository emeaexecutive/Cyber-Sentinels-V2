import Link from "next/link";

const checks = [
  "Deepfake video detection",
  "Fake image detection",
  "Cloned voice detection",
  "Image authenticity",
  "Audio clone risk",
  "Audit logs",
];

export default function DeepfakeDetectionPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          AI trust infrastructure
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          Deepfake video detection for proof before permission.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels scores synthetic identities, fake images, cloned
          voice samples and manipulated video before they enter hiring,
          onboarding or high-risk workflows.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{check}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Signals feed evidence is converted into audit-ready trust
                records for verified humans, candidate verification and AI
                agent passports.
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
