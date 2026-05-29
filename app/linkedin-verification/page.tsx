import Link from "next/link";

export default function LinkedInVerificationPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>

        <section className="mt-10">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Professional identity signal
          </p>
          <h1 className="mt-6 text-5xl font-bold">
            LinkedIn Trust Verification
          </h1>
          <p className="mt-6 max-w-3xl text-xl text-zinc-300">
            LinkedIn is one signal, not the source of truth.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            "Cyber Sentinels uses professional identity signals as part of a wider Trust Passport.",
            "Verification should combine human presence, origin trace, evidence, audit logs and review.",
            "No scraping, unofficial LinkedIn APIs or LinkedIn endorsement are implied.",
          ].map((copy) => (
            <div
              key={copy}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <p className="leading-7 text-zinc-300">{copy}</p>
            </div>
          ))}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/passport"
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Add to Trust Passport
          </Link>
          <Link
            href="/hiring-shield"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Add to Hiring Shield
          </Link>
          <Link
            href="/back-office"
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white"
          >
            Review in Back Office
          </Link>
        </div>
      </div>
    </main>
  );
}
