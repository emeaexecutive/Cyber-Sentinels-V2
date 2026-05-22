import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-500">
          Cyber Sentinels V2
        </p>

        <h1 className="mt-8 max-w-4xl text-6xl font-bold">
          Proof before permission.
        </h1>

        <p className="mt-6 max-w-2xl text-zinc-400">
          AI trust infrastructure for verified humans, autonomous agents,
          hiring signals and synthetic identity risk.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/passport" className="rounded-xl bg-white px-5 py-3 font-semibold text-black">
            Create Passport
          </Link>

          <Link href="/command-center" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Command Center
          </Link>

          <Link href="/hiring-shield" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Hiring Shield
          </Link>

          <Link href="/clearances" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Clearances
          </Link>

          <Link href="/signals" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Signals
          </Link>

          <Link href="/deepfake-detection" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Deepfake Detection
          </Link>

          <Link href="/video-verification" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Video Verification
          </Link>

          <Link href="/agent-passport" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Agent Passport
          </Link>

          <Link href="/human-presence-index" className="rounded-xl border border-zinc-700 px-5 py-3 text-white">
            Human Presence Index
          </Link>
        </div>
      </div>
    </main>
  );
}
