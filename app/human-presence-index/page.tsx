import Link from "next/link";

const categories = [
  {
    name: "Biometric signals",
    copy: "Face, voice, retina and fingerprint confidence for authentic human presence.",
  },
  {
    name: "Behavioural signals",
    copy: "Behaviour, device and trust-history patterns that prove presence over time.",
  },
  {
    name: "Liveness signals",
    copy: "Not just liveness, but evidence that a real person is present now and repeatedly.",
  },
  {
    name: "Media authenticity",
    copy: "Built for deepfake video, cloned voice, fake profiles and synthetic candidates.",
  },
  {
    name: "Provenance / C2PA status",
    copy: "Media and credential provenance signals for audit-ready verification workflows.",
  },
  {
    name: "Trust Timeline",
    copy: "A score that compounds identity, behaviour, media risk and trust history.",
  },
];

export default function HumanPresenceIndexPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
            HPI
          </p>

          <h1 className="mt-6 max-w-4xl text-5xl font-bold">
            Human Presence Index™
          </h1>

          <p className="mt-6 max-w-3xl text-zinc-400">
            Beyond face recognition. Beyond liveness. Proof of authentic human
            presence over time.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">
            Beyond face recognition. Beyond deepfake detection.
          </h2>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Human Presence Index™ is not just facial recognition and not just
            liveness. It is proof of authentic human presence over time using
            face, voice, retina, fingerprint, behaviour, device, media and
            trust-history signals.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.name}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{category.name}</h2>
              <p className="mt-3 text-sm text-zinc-500">{category.copy}</p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/passport"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Create Trust Passport
          </Link>

          <Link
            href="/hiring-shield"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Run Hiring Shield
          </Link>
        </div>
      </div>
    </main>
  );
}
