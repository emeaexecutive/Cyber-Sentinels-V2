import { notFound } from "next/navigation";
import { TrackBlockSurface } from "@/src/components/protected-workflows/TrackBlockSurface";
import { candidateAliceInvestorDemo } from "@/src/lib/protected-workflows/candidate-alice-demo";

export default function CandidateAliceTrackBlockDemoPage() {
  const deploymentEnvironment = process.env.VERCEL_ENV;
  if (deploymentEnvironment === "production" || (!deploymentEnvironment && process.env.NODE_ENV === "production")) notFound();
  const demo = candidateAliceInvestorDemo();
  return <main className="operational-shell min-h-screen px-4 py-10 text-zinc-100 sm:px-6 md:px-8"><div className="mx-auto max-w-7xl">
    <header><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Non-production investor demonstration</p><h1 className="mt-2 text-4xl font-semibold">Candidate Alice · Policy and identity continuity</h1><p className="mt-3 max-w-3xl text-zinc-400">A synthetic, provider-neutral flow rendered through the existing Track + Block canonical evidence surface. Decisions are evaluated from policy and continuity evidence at runtime.</p></header>
    <TrackBlockSurface enterpriseId={demo.workspace} initialData={demo} />
  </div></main>;
}
