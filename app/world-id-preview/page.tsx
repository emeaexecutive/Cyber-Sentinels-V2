import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inspectWorldIdConfiguration } from "@/lib/providers/world-id-verifier";
import { WorldIdHumanProof } from "@/components/world-id-human-proof";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "World ID Preview | Cyber Sentinels",
  robots: { index: false, follow: false },
};

export default async function WorldIdPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/world-id-preview");
  const configuration = inspectWorldIdConfiguration();

  return <main className="min-h-screen bg-black px-6 py-12 text-white">
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Staging / Preview qualification</p>
      <h1 className="mt-3 text-4xl font-semibold">World ID human proof</h1>
      <p className="mt-4 leading-7 text-zinc-400">This operator surface requests a genuine World ID 4.0 Proof of Human, verifies the unmodified IDKit result server-side, claims its nullifier in the durable replay store, and then runs the existing identity, authority, policy, canonical transaction, receipt, Replay, and Trust Memory services. It does not simulate provider success or treat identity as authorization.</p>
      <div className="mt-8">
        {configuration.configured
          ? <WorldIdHumanProof />
          : <section className="rounded-xl border border-amber-900 bg-amber-950/20 p-6 text-amber-100">World Developer Portal configuration is incomplete. No proof request can be generated.</section>}
      </div>
    </div>
  </main>;
}
