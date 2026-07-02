import Link from "next/link";
import { demoRealityOS } from "@/lib/trust-engine/realityOS";
import {
  trustFabricAuditEvents,
  trustFabricSignals,
} from "@/lib/trust-engine/trustFabric";

function stateClass(value: string) {
  if (value === "containment" || value === "high_alert") {
    return "border-red-700 text-red-200";
  }
  if (value === "adaptive" || value === "monitoring") {
    return "border-amber-700 text-amber-200";
  }

  return "border-emerald-700 text-emerald-200";
}

export default function RealityOSPage() {
  const os = demoRealityOS;
  const sections = [
    ["Connected Systems", `${os.connected_systems.length} systems online`],
    ["Active Fabric Nodes", os.active_nodes],
    ["Reality State", os.state],
    ["Trust Signals", os.trust_signals],
    ["Permissions Layer", os.permissions_layer],
    ["Human Presence", os.human_presence],
    ["Synthetic Activity", os.synthetic_activity],
    ["Network Relationships", os.network_relationships],
    ["Operational Trust Activity", os.global_trust_activity],
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="flex flex-wrap gap-3 text-sm">
          {[
            ["/", "Home"],
            ["/trust-fabric", "Authorization Lineage"],
            ["/mission-control", "Mission Control"],
            ["/trust-graph", "Trust Graph"],
            ["/trust-prediction", "Prediction Engine"],
            ["/permissions-firewall", "Permissions Firewall"],
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
            Operational Trust context
          </p>
          <h1 className="mt-4 text-4xl font-semibold md:text-6xl">
            Operational Trust across connected workflows
          </h1>
          <p className="mt-5 max-w-3xl leading-8 text-zinc-400">
            Evidence, Session Integrity, Authorization Lineage and Governance Review remain connected.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Active Nodes", os.active_nodes],
            ["Operational state", os.state],
            ["Authorization continuity", os.trust_fabric_health],
            ["Signals", os.trust_signals],
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Operational state</h2>
            <span
              className={`mt-5 inline-flex rounded-full border px-3 py-1 text-sm ${stateClass(
                os.state
              )}`}
            >
              {os.state}
            </span>
            <p className="mt-5 text-sm leading-6 text-zinc-500">
              Humans, agents, media, evidence and permission decisions are
              evaluated as one operating layer.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Connected Systems</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {os.connected_systems.map(([label, href]) => (
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
        </section>
      </div>
    </main>
  );
}
