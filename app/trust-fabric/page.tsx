import Link from "next/link";
import {
  connectedTrustSystems,
  demoTrustFabric,
  trustFabricAuditEvents,
  trustFabricNodeTypes,
  trustFabricSignals,
} from "@/lib/trust-engine/trustFabric";

function healthClass(value: string) {
  if (value === "weak") return "border-red-700 text-red-200";
  if (value === "watch") return "border-amber-700 text-amber-200";

  return "border-emerald-700 text-emerald-200";
}

export default function TrustFabricPage() {
  const fabric = demoTrustFabric;
  const sections = [
    ["Connected Systems", connectedTrustSystems.length],
    ["Active Fabric Nodes", fabric.active_nodes],
    ["Reality State", "adaptive"],
    ["Trust Signals", fabric.signals],
    ["Permissions Layer", fabric.permissions],
    ["Human Presence", fabric.humans],
    ["Synthetic Activity", fabric.synthetic_activity],
    ["Network Relationships", fabric.relationships],
    ["Operational Trust Activity", fabric.global_activity],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/reality-os", "Operational Trust Context"],
            ["/trust-graph", "Trust Graph"],
            ["/trust-timeline", "Trust Timeline"],
            ["/evidence-vault", "Evidence Vault"],
            ["/mission-control", "Mission Control"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-zinc-800 px-3 py-2 text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">
            Connected trust graph
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Authorization Lineage
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Connected evidence, permissions and relationships explain who could act and why.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ["Active Nodes", fabric.active_nodes],
            ["Humans", fabric.humans],
            ["Agents", fabric.agents],
            ["Signals", fabric.signals],
            ["Authorization continuity", fabric.health],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-semibold capitalize">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Active Fabric Nodes</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustFabricNodeTypes.map((type) => (
                <code
                  key={type}
                  className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {type}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Authorization continuity</h2>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${healthClass(
                fabric.health
              )}`}
            >
              {fabric.health}
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"
            >
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-4 text-3xl font-semibold capitalize">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Connected Systems</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {connectedTrustSystems.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Signals</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {trustFabricSignals.map((signal) => (
                  <code
                    key={signal}
                    className="rounded-full border border-cyan-800 px-2.5 py-1 text-xs text-cyan-200"
                  >
                    {signal}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="text-xl font-semibold">Audit</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {trustFabricAuditEvents.map((event) => (
                  <code
                    key={event}
                    className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300"
                  >
                    {event}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
