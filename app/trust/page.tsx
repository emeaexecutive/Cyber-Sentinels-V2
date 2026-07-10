import Link from "next/link";

const trustPrinciples = [
  ["Evidence before outcome", "Trust Posture is supported by inspectable evidence, not a hidden verdict."],
  ["Replayable memory", "Material trust changes remain reconstructable after the runtime moment has passed."],
  ["Human governance", "Sensitive workflow changes remain reviewable, attributable and reversible where appropriate."],
  ["Provider transparency", "Live, Simulated, Awaiting Credentials and Disabled states remain explicit."],
];

const conceptHomes = [
  ["Replay", "The operational memory fabric for trust chronology, evidence, authorization, governance and outcome history.", "/verification-replay"],
  ["AI Sovereignty", "Enterprise control over provider use, data classification, restricted processing and customer-owned memory.", "/trust/data-sovereignty"],
  ["Trust Principles", "The public rules that keep Cyber Sentinels bounded, evidence-aware and governance-led.", "/trust-principles"],
  ["Security", "Security posture, disclosure channels and trust operations commitments.", "/security"],
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Trust Center</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Public trust, replay and sovereignty in one place.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            The Trust Center explains how Cyber Sentinels handles evidence, replayable operational memory, AI sovereignty, provider transparency and governance boundaries.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-500">
            Case-level timelines, reviewer notes and operational dashboards remain protected because they contain customer trust data.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {conceptHomes.map(([title, copy, href]) => (
            <Link key={href} href={href} className="rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{copy}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
            Operating principles
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {trustPrinciples.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-4">
                <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/platform" className="brand-primary-action">Platform Architecture</Link>
          <Link href="/enterprise-access" className="brand-secondary-action">Discuss Enterprise Controls</Link>
        </div>
      </div>
    </main>
  );
}
