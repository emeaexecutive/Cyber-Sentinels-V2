import { TrustOpsOperatingStack } from "@/components/trustops-operating-stack";

export default function PlatformPage() {
  return (
    <main className="operational-shell min-h-screen px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="operational-panel p-6 md:p-8">
          <p className="operational-eyebrow">
            Trust Operations platform
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            Operational trust for intelligent systems.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
            Cyber Sentinels is the operational trust infrastructure layer for
            humans, AI agents and enterprise workflows. TrustOps connects
            persistent posture, governed execution, workflow verification and
            operational accountability.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">
            Trust changes over time. Persistent Trust Posture explains the
            current state. Replay provides operational memory for enterprise
            trust.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            The platform keeps workflow decisions explainable without replacing
            accountable human authority or turning trust into a permanent score.
          </p>
          <p className="mt-5 max-w-3xl border-l border-cyan-800 pl-4 text-base leading-7 text-zinc-200">
            Cyber Sentinels helps enterprises understand, govern and verify
            operational trust across humans, AI agents and workflows.
          </p>
        </section>

        <section className="mt-8">
          <p className="operational-eyebrow">Eight connected layers</p>
          <h2 className="mt-3 text-2xl font-semibold">The TrustOps operating stack.</h2>
          <div className="mt-6">
            <TrustOpsOperatingStack />
          </div>
        </section>
      </div>
    </main>
  );
}
