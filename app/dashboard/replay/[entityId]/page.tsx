import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CanonicalTransactionError, loadCanonicalTrustTransactionHistory } from "@/lib/trust-transaction/server";

export const dynamic = "force-dynamic";

export default async function CanonicalReplayPage({ params }: { params: Promise<{ entityId: string }> }) {
  const transactionId = (await params).entityId;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/replay/${transactionId}`)}`);
  let history;
  try {
    history = await loadCanonicalTrustTransactionHistory({ supabase, user, transactionId });
  } catch (error) {
    if (error instanceof CanonicalTransactionError && [400, 404].includes(error.status)) notFound();
    throw error;
  }
  const { receipt, events, outcomes, nativeEnforcement } = history;
  const chronology = events as Array<Record<string, unknown>>;
  return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-6xl">
    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">V1 canonical Replay</p><h1 className="mt-3 text-4xl font-semibold">Transaction chronology</h1><p className="mt-3 break-all font-mono text-xs text-zinc-500">{receipt.transactionId}</p>
    <section className="mt-7 grid gap-3 md:grid-cols-4">{[["Decision", receipt.decision], ["Trust state", receipt.trustState], ["Authority", receipt.authorityReference], ["Policy", `${receipt.policy.id}:${receipt.policy.version}`]].map(([label, value]) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 break-all text-sm text-zinc-100">{value}</p></div>)}</section>
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-2xl font-semibold">Immutable event sequence</h2><ol className="mt-5 grid gap-3">{chronology.map((event, index) => <li key={String(event.event_id)} className="grid gap-3 rounded-lg border border-zinc-800 bg-black p-4 sm:grid-cols-[2rem_1fr]"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-900 text-xs">{index + 1}</span><div><div className="flex flex-wrap justify-between gap-3"><p className="font-semibold">{String(event.event_type)}</p><time className="text-xs text-zinc-500">{String(event.occurred_at)}</time></div><p className="mt-2 text-sm text-zinc-400">{String(event.reason ?? "No reason recorded")}</p><p className="mt-2 break-all font-mono text-xs text-zinc-600">Digest {String(event.record_digest ?? "not recorded")}</p></div></li>)}{!chronology.length ? <li className="rounded-lg border border-dashed border-zinc-700 p-5 text-zinc-500">No canonical events are stored for this transaction.</li> : null}</ol></section>
    <section className="mt-6 grid gap-3 md:grid-cols-3">{[["External outcomes", outcomes.length], ["Native acknowledgements", nativeEnforcement.acknowledgements.length], ["Destination observations", nativeEnforcement.destinationObservations.length]].map(([label, value]) => <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</section>
    <div className="mt-7 flex gap-4 text-sm"><Link className="text-cyan-200" href={`/trust/transactions/${receipt.transactionId}`}>Open full canonical receipt</Link><Link className="text-cyan-200" href="/dashboard/replay">Back to Replay</Link></div>
  </div></main>;
}
