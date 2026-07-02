import Link from "next/link";
import {
  getVerificationProviderRegistry,
  providerRuntimeState,
} from "@/lib/providers";

export const dynamic = "force-dynamic";

const statusMeaning = [
  ["Live", "Configured and available for its stated workflow purpose."],
  ["Simulated", "Controlled demonstration data only; no live provider result is claimed."],
  ["Awaiting Credentials", "Integration support exists, but required credentials are not configured."],
  ["Disabled", "Not active in the current environment or workflow."],
];

const boundaries = [
  ["Workflow evidence", "Cyber Sentinels preserves evidence, state changes, review actions and outcomes across a workflow."],
  ["Provider signals", "External signals can inform review when configured, but no provider result becomes a final verdict on its own."],
  ["Human governance", "Sensitive outcomes remain subject to named review ownership and recorded intervention."],
  ["Measured claims", "No biometric, deepfake or fraud-accuracy claim is made without representative independent validation."],
];

function statusClass(status: string) {
  if (status === "Live") return "border-emerald-800 text-emerald-200";
  if (status === "Simulated") return "border-cyan-800 text-cyan-200";
  if (status === "Awaiting Credentials") return "border-amber-800 text-amber-200";
  return "border-zinc-700 text-zinc-300";
}

export default function VerificationStatusPage() {
  const providers = getVerificationProviderRegistry();

  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white sm:px-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link href="/verification/receipt/demo" className="text-zinc-300 hover:text-white">
            Demo receipt
          </Link>
          <Link href="/enterprise-access" className="text-cyan-200 hover:text-white">
            Request Enterprise Access
          </Link>
        </nav>

        <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Verification status
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-5xl">
            Clear boundaries for every verification source.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">
            See what is live, what is simulated and what still requires configuration.
            Provider evidence supports an explainable workflow outcome; it does not create certainty by itself.
          </p>
        </section>

        <section className="mt-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">Status language</p>
            <h2 className="mt-3 text-2xl font-semibold">One meaning for each provider state.</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statusMeaning.map(([status, meaning]) => (
              <article key={status} className="rounded-lg border border-zinc-800 bg-black p-4">
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClass(status)}`}>
                  {status}
                </span>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{meaning}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950 p-5 md:p-6">
          <h2 className="text-2xl font-semibold">Provider integration status</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Current environment state, shown without implying unverified provider performance.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {providers.map((provider) => {
              const status = providerRuntimeState(provider);
              return (
                <article key={provider.id} className="rounded-lg border border-zinc-800 bg-black p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-semibold text-zinc-100">{provider.name}</h3>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(status)}`}>
                      {status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{provider.notes}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold">What the platform claims</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {boundaries.map(([title, copy]) => (
              <article key={title} className="rounded-lg border border-zinc-800 bg-black p-5">
                <h3 className="font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-cyan-950 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Continue the conversation</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
            Bring one exposed workflow, its evidence boundary and the human decision that needs to remain accountable.
          </p>
          <Link href="/enterprise-access" className="brand-primary-action mt-5">
            Request Enterprise Access
          </Link>
        </section>
      </div>
    </main>
  );
}
