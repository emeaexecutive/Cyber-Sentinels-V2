import Link from "next/link";

const demoSteps = [
  "Create Passport",
  "Upload Evidence",
  "Accept Evidence",
  "Approve Decision",
  "View Trust Passport",
  "Open Trust Graph",
  "Review Audit Trail",
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            V1 Demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Cyber Sentinels Demo Workflow
          </h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            Walk through the V1 Trust OS flow without exposing private records:
            create a passport, attach evidence, review the case, record a
            decision, then inspect the passport, graph and audit trail.
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
          {demoSteps.map((step, index) => (
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
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Use real workflow screens and live records. Empty states are OK
                for the first run and should guide the next demo action.
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
