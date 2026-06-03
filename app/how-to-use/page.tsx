import Link from "next/link";

const steps = [
  ["1", "Create Trust Passport", "Start with a subject and create the core trust record.", "/passport"],
  ["2", "Upload Evidence", "Attach files or supporting context to the verification workflow.", "/evidence-upload"],
  ["3", "Review Evidence", "Use the Back Office to inspect submitted evidence and related case context.", "/back-office#evidence-review"],
  ["4", "Approve / Reject / Request More Evidence", "Record an admin decision so the workflow has a clear outcome.", "/verification-queue"],
  ["5", "View Trust Passport", "Open the passport to review trust score, status, evidence, decisions, signals and audit trail.", "/passports"],
  ["6", "Open Trust Graph", "Inspect relationships between passport, evidence, decisions, audit events and signals.", "/trust-graph-engine"],
  ["7", "Review Audit Trail", "Confirm the workflow history is traceable before relying on the result.", "/back-office#audit-timeline"],
];

export default function HowToUsePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
            Draft policy - requires legal review before production use.
          </p>
          <h1 className="mt-4 text-4xl font-semibold">How to Use Cyber Sentinels</h1>
          <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
            Run a simple Trust OS workflow from passport creation through
            evidence review, graph inspection and audit trail verification.
          </p>
        </section>

        <section className="mt-8 grid gap-4">
          {steps.map(([number, title, copy, href]) => (
            <Link
              key={title}
              href={href}
              className="grid gap-4 rounded-lg border border-zinc-800 bg-black p-5 hover:border-cyan-800 md:grid-cols-[64px_1fr]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-700 text-lg font-semibold text-cyan-100">
                {number}
              </span>
              <span>
                <span className="block text-xl font-semibold text-zinc-100">
                  {title}
                </span>
                <span className="mt-2 block text-sm leading-6 text-zinc-500">
                  {copy}
                </span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
