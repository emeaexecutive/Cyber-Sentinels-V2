import { ConsensusWorkspace } from "@/src/components/consensus/ConsensusWorkspace";
import { consensusUiContext } from "@/src/lib/consensus/ui-context";
export const dynamic="force-dynamic";
export default async function ConsensusSubjectPage({params}:{params:Promise<{subjectId:string}>}){const {workspace}=await consensusUiContext("/dashboard/consensus");const {subjectId}=await params;return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-6xl"><p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Consensus subject</p><h1 className="mt-3 break-all text-3xl font-semibold">{subjectId}</h1><div className="mt-8">{workspace?<ConsensusWorkspace enterpriseId={workspace.id} mode="subject" reference={subjectId}/>:null}</div></div></main>;}
