import Link from "next/link";
import { demoAgentPassportV2 } from "@/lib/core/agent-passport-v2";

const capabilities = [
  "Passport v2 JSON export",
  "Future VC adapter",
  "Future JWT/JWS adapter",
  "Delegation limits",
  "Revocation status",
  "Human oversight",
];

export default function AgentPassportPage() {
  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Back to Cyber Sentinels
        </Link>
        <Link
          href="/agent-registry"
          className="ml-3 text-sm text-zinc-400 hover:text-white"
        >
          Open Agent Registry™
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-zinc-500">
          Verified Agent
        </p>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold">
          AI agent passports for governed workflow access.
        </h1>

        <p className="mt-6 max-w-3xl text-zinc-400">
          Cyber Sentinels gives AI agents a standards-ready operational trust
          record with versioning, export formats, delegated authority,
          human oversight, revocation state and governance-before-permission
          controls.
        </p>

        <Link
          href="/agent-registry"
          className="mt-8 inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          View Agent Registry™
        </Link>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <div
              key={capability}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <h2 className="text-xl font-semibold">{capability}</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Connect agent identity with owners, permissions, provenance,
                evidence chains, operational signals and human governance
                review.
              </p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Agent Passport v2</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              ["Version", demoAgentPassportV2.passportVersion],
              ["Credential", demoAgentPassportV2.credentialFormat],
              ["Governance", demoAgentPassportV2.governanceStatus],
              ["Oversight", demoAgentPassportV2.humanOversightStatus],
              ["Revocation", demoAgentPassportV2.revocationStatus],
              ["Jurisdiction", demoAgentPassportV2.jurisdiction],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-zinc-600">{label}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-100">{String(value).replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-zinc-500">{demoAgentPassportV2.boundary}</p>
        </section>
      </div>
    </main>
  );
}
