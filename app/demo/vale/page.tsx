import Link from "next/link";

const evidence = [
  ["Verified actor", "Alice -> Agent Alpha -> Robot Beta"],
  ["Signed intent", "MOVE pallet 123: Zone A -> Zone B, max 1.0 m/s"],
  ["Machine / model", "Identity, firmware and model attestations attached"],
  ["Runtime provider", "NeuralTrust-compatible tool/runtime observation"],
  ["Assurance provider", "Mythos-compatible deployment assessment"],
  ["Model change", "Navigation model v1 to v2 invalidates the previous assurance until reassessment"],
  ["Deployment gate", "Material model, tool, or permission change requires reauthorization"],
  ["Monitoring", "Fleet telemetry becomes partial before command execution"],
  ["Sensor evidence", "Vision: PATH_CLEAR / LiDAR: OBSTACLE_PRESENT"],
  ["Conflict", "New command targets restricted Zone C"],
] as const;

const continuity = ["INTENDED_ACTION", "REQUESTED_ACTION", "AUTHORIZED_ACTION", "COMMAND_SENT", "COMMAND_ACKNOWLEDGED", "ACTION_EXECUTED", "WORLD_STATE_CHANGED", "CONSEQUENCE_OBSERVED"];

export default function ValeDemoPage() {
  return <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white"><div className="mx-auto max-w-6xl">
    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Non-production investor demo</p>
    <h1 className="mt-3 max-w-4xl text-4xl font-semibold md:text-6xl">Human intent. Agent delegation. Physical consequence. One trust transaction.</h1>
    <p className="mt-5 max-w-3xl leading-7 text-zinc-400">VALE projects robotics and AI context into the existing Cyber Sentinels Trust Fabric. It never owns a parallel policy engine, receipt, graph, Replay, or Trust Memory store.</p>

    <section className="mt-10 grid gap-3 md:grid-cols-4">{["VERIFIED ACTOR", "AUTHORITY + INTENT", "MONITORING + EXECUTION", "CONSEQUENCE + EVIDENCE"].map((item, index) => <div key={item} className="rounded-lg border border-cyan-950 bg-zinc-950 p-4"><p className="text-xs text-cyan-300">0{index + 1}</p><h2 className="mt-2 text-sm font-semibold">{item}</h2></div>)}</section>

    <section className="mt-10 grid gap-4 lg:grid-cols-2">{evidence.map(([title, value]) => <article key={title} className="rounded-lg border border-zinc-800 bg-zinc-950 p-5"><p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{title}</p><p className="mt-2 text-zinc-100">{value}</p></article>)}</section>

    <section className="mt-10 rounded-lg border border-amber-900/70 bg-amber-950/10 p-6"><p className="text-xs uppercase tracking-[0.18em] text-amber-200">Canonical decision boundary</p><h2 className="mt-2 text-2xl font-semibold">No hard-coded outcome</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">The live scenario submits this evidence through <code>/api/v1/evidence</code>, then calls <code>cs.trust.authorize()</code>. Only the canonical trust transaction may return ALLOW, REVIEW, or DENY under the active tenant policy.</p></section>

    <section className="mt-10"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Execution continuity</p><div className="mt-4 flex flex-wrap gap-2">{continuity.map((stage) => <span key={stage} className="rounded-full border border-zinc-800 px-3 py-2 text-xs text-zinc-300">{stage}</span>)}</div></section>

    <section className="mt-10 grid gap-4 md:grid-cols-4">{["Evidence Graph", "Replay", "Trust Memory", "Canonical Receipt"].map((artifact) => <div key={artifact} className="rounded-lg border border-zinc-800 bg-black p-5"><h2 className="font-semibold">{artifact}</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Created by the canonical transaction after persistence; no VALE-specific store.</p></div>)}</section>

    <div className="mt-10 flex flex-wrap gap-3"><Link href="/developers" className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black">Connect a provider</Link><Link href="/developers/quickstart" className="rounded-lg border border-zinc-700 px-4 py-3 text-sm">Run the quickstart</Link></div>
  </div></main>;
}
