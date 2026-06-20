import Link from "next/link";

const principles = [
  ["Evidence before assertion", "Trust decisions should be grounded in material a reviewer can inspect."],
  ["Governance before automation", "High-stakes outcomes need accountable ownership, escalation and human authority."],
  ["Memory before certainty", "Timelines, receipts and replay matter more than a single unexplained score."],
];

export default function MissionPage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-zinc-100">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pb-28 md:pt-20">
        <nav className="text-sm text-zinc-400"><Link href="/" className="hover:text-white">Cyber Sentinels</Link> / Mission</nav>
        <div className="mt-16 max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100">Our mission</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-white md:text-7xl">
            Make trust explainable when the world is no longer easy to verify.
          </h1>
          <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-300">
            Cyber Sentinels began with a simple observation: the systems used
            to make important decisions were losing the ability to explain who
            was present, what evidence existed and why an outcome was trusted.
          </p>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-950/65">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:px-8 md:py-24 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Where we came from</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">A human problem, accelerated by machines.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-zinc-300">
            <p>
              Identity checks were becoming stronger while trust decisions were
              becoming harder. A verified person could still act outside their
              authority. A convincing candidate could still arrive through a
              compromised interview. An AI agent could act without a clear owner.
            </p>
            <p>
              The missing layer was not another detector. It was an operational
              way to connect identity, provenance, evidence, behaviour, review
              and accountability—then preserve that path for the people who had
              to defend the decision later.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Why Cyber Sentinels exists</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.025em] text-white">Trust should be a process—not an assumption.</h2>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            We help enterprises turn uncertain trust questions into evidence-backed,
            human-governed workflows. The outcome is not perfect certainty. It is
            something more useful: clarity, ownership and an audit-ready record.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {principles.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-black">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-8">
          <blockquote className="max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-5xl">
            “AI assists. Humans decide. Cyber Sentinels preserves the evidence of how.”
          </blockquote>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/about/future-of-trust" className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950">The Future of Trust</Link>
            <Link href="/enterprise-access" className="rounded-md border border-zinc-600 px-5 py-3 text-sm font-semibold text-white">Enterprise Access</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
