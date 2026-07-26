import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";

export const dynamic = "force-dynamic";

export default async function ReplayDashboardPage() {
  const { workspace } = await trustArchitectureUiContext("/dashboard/replay");
  if (!workspace) {
    return (
      <main className="min-h-screen bg-[#04070c] p-8 text-amber-200">
        Enterprise workspace required.
      </main>
    );
  }
  const supabase = await createClient();
  const result = await supabase
    .from("trust_entities")
    .select("id,entity_type,entity_name,status,updated_at")
    .eq("tenant_id", workspace.id)
    .neq("status", "DELETED")
    .order("updated_at", { ascending: false })
    .limit(100);
  const entities = result.error ? [] : result.data ?? [];
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Forensic Replay™</p>
        <h1 className="mt-3 text-4xl font-semibold">Choose an entity timeline</h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
          Reconstruct retained evidence, provider, policy, risk, trust and accountable human actions.
        </p>
        <section className="mt-8 grid gap-3 md:grid-cols-2">
          {entities.map((entity) => (
            <Link
              key={entity.id}
              href={`/dashboard/replay/${entity.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800"
            >
              <p className="text-xs uppercase text-cyan-300">{entity.entity_type}</p>
              <h2 className="mt-2 font-semibold">{entity.entity_name}</h2>
              <p className="mt-2 font-mono text-xs text-zinc-500">{entity.id}</p>
            </Link>
          ))}
          {!entities.length ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-sm text-zinc-500">
              No Enterprise Trust Graph entities are available for Replay.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
