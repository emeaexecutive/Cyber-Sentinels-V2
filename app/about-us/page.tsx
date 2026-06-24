import Link from "next/link";

const principles = [
  [
    "AI changed identity risk",
    "Hiring, access and sensitive workflows now face synthetic applicants, proxy sessions, injected media and automated support that can look ordinary at the surface.",
  ],
  [
    "Verification alone is insufficient",
    "A passed identity check does not explain what happened later in the session, which evidence changed or who approved the outcome.",
  ],
  [
    "Operational trust is becoming infrastructure",
    "Teams need a reviewable chain that connects identity context, session integrity, evidence, flags, governance and receipt history.",
  ],
  [
    "Evidence must be replayable",
    "Security, talent and compliance teams should be able to reconstruct the workflow without relying on memory or disconnected logs.",
  ],
];

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="border-b border-zinc-800 pb-14">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
            About Cyber Sentinels
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Trust changed quietly.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">
            Cyber Sentinels builds operational trust infrastructure for
            enterprise workflows where identity, session integrity, governance
            review and verification evidence need to stay connected.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            The product is not a promise that AI can guarantee trust. It is a
            practical system for showing what was verified, what changed, who
            reviewed the case and what proof remains.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100">
              View Demo
            </Link>
            <Link href="/enterprise-access" className="rounded-lg border border-cyan-800 px-5 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Request Enterprise Access
            </Link>
            <Link href="/enterprise-access?intent=design_partner" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
              Become a Design Partner
            </Link>
            <Link href="/enterprise-access?intent=intro_call" className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-400">
              Book Intro Call
            </Link>
          </div>
        </section>

        <section className="grid gap-4 py-14 md:grid-cols-2">
          {principles.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-black p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Founder narrative
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold">
            Organizations need replayable evidence and accountable governance.
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels keeps Hiring Security, Session Integrity,
            Verification Evidence, Governance Review, Replay Evidence and
            Verification Receipts in one operational story. That gives teams a
            calmer way to explain risk, review actions and pilot outcomes.
          </p>
        </section>
      </div>
    </main>
  );
}
