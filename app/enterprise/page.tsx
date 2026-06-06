import Link from "next/link";

const useCases = [
  "Workforce and contractor verification",
  "High-risk workflow review",
  "Evidence-backed operational decisions",
  "Trust and safety operations",
  "Governance and audit readiness",
  "AI-native workflow oversight",
];

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
            Enterprise
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Governed trust workflows for enterprise operations.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels helps enterprise teams connect evidence, review,
            decisions and auditability into explainable trust workflows.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {useCases.map((item) => (
            <div key={item} className="rounded-lg border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-300">{item}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Early platform signaling</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            Cyber Sentinels is onboarding design collaborators to validate
            evidence-backed verification, governance workflows and operational
            transparency in real environments.
          </p>
          <Link
            href="/enterprise-access"
            className="mt-5 inline-flex rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-cyan-100"
          >
            Request Enterprise Access
          </Link>
          <Link
            href="/enterprise/hiring-security"
            className="ml-3 mt-5 inline-flex rounded-lg border border-cyan-800 px-4 py-3 text-sm font-semibold text-cyan-100 hover:border-cyan-400"
          >
            Hiring Security
          </Link>
        </section>
      </div>
    </main>
  );
}
