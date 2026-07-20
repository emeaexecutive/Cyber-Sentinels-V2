"use client";
import { useEffect,useState } from "react";
import type { ConsensusDecision,ConsensusPolicy,ConsensusTrustState } from "@/src/lib/consensus/types";
import { ConsensusStatus } from "./ConsensusStatus";
import { ConsensusScore } from "./ConsensusScore";
import { ConsensusTimeline } from "./ConsensusTimeline";
import { DecisionExplanation } from "./DecisionExplanation";
import { PolicySummary } from "./PolicySummary";
import { ProviderHealthGrid } from "./ProviderHealthGrid";

type Mode="dashboard"|"subject"|"decision"|"providers"|"policies";
type DecisionRow={decision_id:string;subject_id:string;evaluated_at:string;state:ConsensusTrustState;prior_state:ConsensusTrustState|null;confidence:number;policy_version:string;reason_codes:string[]};
type ProviderRow=Parameters<typeof ProviderHealthGrid>[0]["providers"][number];
export function ConsensusWorkspace({enterpriseId,mode,reference}:{enterpriseId:string;mode:Mode;reference?:string}){const [data,setData]=useState<Record<string,unknown>|null>(null);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{const controller=new AbortController();const headers={"x-enterprise-id":enterpriseId};let paths:string[]=[];if(mode==="dashboard")paths=["/api/consensus/decisions","/api/consensus/providers/health","/api/consensus/policies"];if(mode==="subject")paths=[`/api/consensus/subjects/${encodeURIComponent(reference??"")}`,`/api/consensus/subjects/${encodeURIComponent(reference??"")}/timeline`];if(mode==="decision")paths=[`/api/consensus/decisions/${encodeURIComponent(reference??"")}`];if(mode==="providers")paths=["/api/consensus/providers/health"];if(mode==="policies")paths=["/api/consensus/policies"];Promise.all(paths.map(async path=>{const response=await fetch(path,{headers,cache:"no-store",signal:controller.signal});const body=await response.json();if(!response.ok)throw new Error(body.error??"Consensus data unavailable.");return body;})).then((parts)=>setData({parts})).catch((reason)=>{if(!controller.signal.aborted)setError(reason.message);});return()=>controller.abort();},[enterpriseId,mode,reference]);
  if(error)return <section role="alert" className="rounded-xl border border-amber-800 bg-amber-950/20 p-5 text-amber-100">{error}</section>;if(!data)return <section aria-busy="true" className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-950"><span className="sr-only">Loading consensus evidence</span></section>;const parts=data.parts as Array<Record<string,unknown>>;
  if(mode==="decision")return <DecisionExplanation decision={parts[0].decision as ConsensusDecision}/>;
  if(mode==="providers")return <ProviderHealthGrid providers={parts[0].providers as ProviderRow[]}/>;
  if(mode==="policies")return <div className="grid gap-4">{(parts[0].policies as ConsensusPolicy[]).map((policy)=><PolicySummary key={`${policy.policyId}:${policy.version}`} policy={policy}/>)}</div>;
  if(mode==="subject"){const state=parts[0].state as {state:ConsensusTrustState;confidence:number;updated_at:string};const decisions=parts[1].decisions as DecisionRow[];return <div className="grid gap-6"><section className="grid gap-5 rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:grid-cols-[1fr_280px]"><div><p className="text-sm text-zinc-400">Current materialized state</p><div className="mt-3"><ConsensusStatus state={state.state}/></div><p className="mt-4 text-xs text-zinc-500">Updated {new Date(state.updated_at).toLocaleString()}; append-only decisions remain the audit source.</p></div><ConsensusScore confidence={state.confidence}/></section><ConsensusTimeline decisions={decisions}/></div>;}
  const decisions=parts[0].decisions as DecisionRow[];const providers=parts[1].providers as ProviderRow[];const policies=parts[2].policies as ConsensusPolicy[];return <div className="grid gap-8"><ProviderHealthGrid providers={providers}/><section><h2 className="text-2xl font-semibold">Active consensus policy</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{policies.slice(0,2).map((policy)=><PolicySummary key={`${policy.policyId}:${policy.version}`} policy={policy}/>)}</div></section><ConsensusTimeline decisions={decisions}/></div>;
}
