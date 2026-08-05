import Link from "next/link";

const investorQuestions = [
  "What changed?",
  "Who authorized the action?",
  "Which evidence supported the decision?",
  "Who was accountable?",
  "Can the organization prove it?",
];

export default function InvestorPage() {
  return (
    <main className="min-h-screen bg-[#04070c] text-white">
      <section className="border-b border-zinc-900 px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Investor overview</p>
          <h1 className="mt-5 max-w-5xl text-4xl font-semibold leading-tight md:text-6xl">
            Operational Trust Intelligence™ for intelligent enterprises.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200">
            Cyber Sentinels is building infrastructure for a world in which people, AI agents and automated workflows
            make consequential decisions together.
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-200">
            The opportunity is not another alerting product. It is the independent operational trust layer connecting
            identity, authority, evidence, decisions and outcomes.
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">
            Design-partner and early-investor conversations are now open.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/enterprise-access?intent=design_partner"
              className="brand-secondary-action brand-action-large text-sm"
            >
              Join the design-partner programme
            </Link>
            <Link
              href="/enterprise-access?intent=intro_call"
              className="brand-primary-action brand-action-large text-sm"
            >
              Request an enterprise conversation
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Enterprise problem</p>
          <h2 className="mt-3 text-3xl font-semibold">Accountability fragments when operational evidence does.</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Identity, security, AI and business systems each hold part of the story. Enterprises need customer-controlled
            evidence that preserves historical proof as conditions, authority and decisions change.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {investorQuestions.map((question) => (
            <p key={question} className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300">
              {question}
            </p>
          ))}
        </div>
      </section>

      <section className="border-y border-zinc-900 bg-zinc-950 px-6 py-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">Category distinction</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold">The record of trust is part of the outcome.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Most platforms detect, authenticate, monitor or contain. Cyber Sentinels preserves the operational evidence
            showing what changed, why trust changed, who was accountable and what happened next.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            The platform is at the design-partner stage. Public statements describe the category and intended enterprise
            outcome, with deeper product evidence reserved for controlled conversations.
          </p>
        </div>
      </section>
    </main>
  );
}
