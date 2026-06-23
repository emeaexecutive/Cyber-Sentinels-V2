import Link from "next/link";

export const dynamic = "force-dynamic";

type AgentTrustPageProps = {
  params: Promise<{ id: string }>;
};

const conceptActivity = [
  "Declared purpose reviewed",
  "Organization ownership linked",
  "Signed operational action recorded",
  "Human review path preserved",
];

export default async function AgentTrustPage({ params }: AgentTrustPageProps) {
  const { id } = await params;
  const readableId = decodeURIComponent(id);

  return (
    <main className="min-h-screen bg-[#05070b] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/agents" className="text-sm text-zinc-400 hover:text-white">
          Back to AI Agent Identity
        </Link>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Concept Agent Profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-5xl">
            {readableId}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
            This page previews a staged operational trust layer for organization-owned AI agents and authorization lineage. It is intentionally lightweight and does not provide runtime control, delegated permissions or agent execution.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Owner", "Linked organization"],
            ["Status", "Concept review"],
            ["Scope", "Declared operational role"],
            ["Accountability", "Human-governed workflow"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-black p-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                {label}
              </p>
              <p className="mt-3 text-lg font-semibold text-zinc-100">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-black p-6">
            <h2 className="text-2xl font-semibold">Operational Provenance</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Future agent activity should be linked to signed operational actions, authorization lineage, evidence context, governance workflows and accountable human ownership.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black p-6">
            <h2 className="text-2xl font-semibold">Human-to-Agent Linkage</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              AI agents should remain connected to organizations, owners and
              review processes. Cyber Sentinels is exploring this as early
              platform direction, not as a replacement for governance owners.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold">Signed Activity Visibility</h2>
          <div className="mt-5 grid gap-3">
            {conceptActivity.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
