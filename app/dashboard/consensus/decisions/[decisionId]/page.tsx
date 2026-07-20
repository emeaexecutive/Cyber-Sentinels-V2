import { ConsensusWorkspace } from "@/src/components/consensus/ConsensusWorkspace";
import { consensusUiContext } from "@/src/lib/consensus/ui-context";
export const dynamic="force-dynamic";
export default async function ConsensusDecisionPage({params}:{params:Promise<{decisionId:string}>}){const {workspace}=await consensusUiContext("/dashboard/consensus");const {decisionId}=await params;return <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white"><div className="mx-auto max-w-7xl">{workspace?<ConsensusWorkspace enterpriseId={workspace.id} mode="decision" reference={decisionId}/>:null}</div></main>;}
