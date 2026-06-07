import Link from "next/link";

const workflowSteps = [
  [
    "Identity",
    "Define the person, team, agent or operational workflow being reviewed.",
  ],
  [
    "Evidence",
    "Attach supporting records so the verification workflow is grounded in reviewable material.",
  ],
  [
    "Verification",
    "Track the verification state without burying teams in technical noise.",
  ],
  [
    "Trust Events",
    "Record important changes as operational events that can be revisited later.",
  ],
  [
    "Human Review",
    "Escalate sensitive cases into accountable operational review.",
  ],
  [
    "Audit Trail",
    "Preserve the decision path for governance visibility and later review.",
  ],
];

const audiences = [
  "Enterprise operations teams",
  "Trust and safety reviewers",
  "Hiring and workforce verification teams",
  "Governance and compliance leads",
];

const principles = [
  "Evidence-backed trust",
  "Explainable verification",
  "Human review where it matters",
  "Governance visibility without invasive tracking",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <section className="border-b border-zinc-900 px-6 py-20 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Operational Trust Infrastructure
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-semibold leading-tight md:text-7xl">
            Cyber Sentinels helps teams run evidence-backed verification
            workflows.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            A calm infrastructure layer for identity context, evidence,
            operational review, trust events and audit visibility.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-500">
            Built for organizations that need explainable verification and
            governance visibility without turning user workflows into noisy
            monitoring dashboards.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
            >
              View Pricing
            </Link>
            <Link
              href="/enterprise-access"
              className="rounded-lg border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-cyan-500"
            >
              Request Enterprise Access
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
            How It Works
          </p>
          <h2 className="mt-4 text-3xl font-semibold md:text-4xl">
            One clear operational flow.
          </h2>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Cyber Sentinels organizes verification work into a simple path that
            teams can understand quickly and review later.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workflowSteps.map(([title, copy], index) => (
            <article
              key={title}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                  {String(index + 1).padStart(2, "0")}
                </p>
                {index < workflowSteps.length - 1 ? (
                  <span className="text-zinc-600" aria-hidden="true">
                    &rarr;
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-100">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
              Who It Is For
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Teams that need trust to be operational, not abstract.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {audience}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
              Trust Posture
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Clear enough for users. Structured enough for enterprise review.
            </h2>
            <div className="mt-6 grid gap-3">
              {principles.map((principle) => (
                <div
                  key={principle}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
                >
                  {principle}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8">
        <div className="grid gap-6 rounded-lg border border-zinc-800 bg-black p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
              Enterprise Readiness
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Start small, keep the audit path visible.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Use Cyber Sentinels to create verification workflows, attach
              evidence, review status and preserve governance visibility as the
              workflow matures.
            </p>
          </div>
          <Link
            href="/enterprise"
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
          >
            Explore Enterprise
          </Link>
        </div>
      </section>
    </main>
  );
}
