import Link from "next/link";

const receiptSections = [
  ["Trust state", "The outcome is stated plainly, including elevated risk or manual review states."],
  ["Verification evidence", "Receipt language references the evidence chain without exposing sensitive records publicly."],
  ["Reviewer decision", "Human decisions and rationale remain tied to the final workflow outcome."],
  ["Replay reference", "Receipts can point to protected replay chronology when an authorized reviewer needs detail."],
  ["Audit-ready report", "The receipt provides a portable summary of what was checked, reviewed and resolved."],
];

export default function VerificationReceiptsPage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Verification Receipts
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold md:text-5xl">
            Audit-ready receipts for verification outcomes.
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Verification Receipts summarize what was checked, which state was reached, what reviewer decision was recorded and which replay chronology supports the workflow outcome. Public pages explain the receipt model; specific receipts remain protected unless intentionally shared.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {receiptSections.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
              <h2 className="text-xl font-semibold text-zinc-100">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Printable, governed and evidence-driven</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            A receipt is not a public data dump. It is a controlled, audit-ready report that helps enterprise teams explain why a verification outcome was accepted, escalated or rejected.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/demo" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-100">
              View demo
            </Link>
            <Link href="/verification/receipt/demo" className="rounded-lg border border-cyan-800 px-4 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-400">
              Open protected receipt
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
