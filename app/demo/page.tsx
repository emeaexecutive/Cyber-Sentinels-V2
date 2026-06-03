import Link from "next/link";

const demoSteps = [
  [
    "Create Passport",
    "Create a Trust Passport for the person, organisation, AI agent or workflow being reviewed.",
    "The demo starts with a structured trust record.",
  ],
  [
    "Upload Evidence",
    "Attach supporting files or records to the verification case.",
    "Evidence gives the review process something concrete to assess.",
  ],
  [
    "Review Verification",
    "Inspect the submitted evidence and current verification state.",
    "Human review remains part of high-risk trust outcomes.",
  ],
  [
    "Decision Recorded",
    "Record an approval, rejection or request for more evidence.",
    "The decision becomes part of the passport history.",
  ],
  [
    "Audit Trail Created",
    "Confirm that evidence, review and decision events are traceable.",
    "Audit visibility supports accountability and governance.",
  ],
  [
    "Trust Visibility Generated",
    "Open the passport and Trust Graph to see relationships and status.",
    "Decision-makers can understand the trust state without reading raw system data.",
  ],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            V1 Demo Experience
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Understand Cyber Sentinels in under two minutes
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            This guided demo shows how governed verification moves from a Trust
            Passport to evidence-backed review, decision history, audit
            visibility and trust relationship insight.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/passport"
              className="rounded-lg bg-white px-4 py-3 font-semibold text-black"
            >
              Start Demo Workflow
            </Link>
            <Link
              href="/passports"
              className="rounded-lg border border-zinc-700 px-4 py-3 text-zinc-300 hover:text-white"
            >
              View Trust Passports
            </Link>
            <Link
              href="/back-office"
              className="rounded-lg border border-cyan-800 px-4 py-3 text-cyan-100 hover:text-white"
            >
              Open Back Office
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoSteps.map(([step, copy, value], index) => (
            <article
              key={step}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                Step {index + 1}
              </span>
              <h2 className="mt-3 text-xl font-semibold text-zinc-100">
                {step}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-500">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Demo Outcome</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            By the end of the flow, the user can see a verification status, the
            evidence supporting review, the recorded decision, the audit trail
            and a simple view of trust relationships.
          </p>
        </section>
      </div>
    </main>
  );
}
