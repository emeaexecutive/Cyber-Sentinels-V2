import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CanonicalTrustEvent } from "@/src/lib/trust-events/types";
import type { TrustDecisionContract } from "../trust-architecture/decision-contracts.ts";
import type { TrustState, TrustStateDecision } from "./types.ts";

function fail(operation:string,error:unknown):never{console.error(`${operation} failed.`,{code:(error as {code?:string})?.code});throw Object.assign(new Error(`${operation} failed safely.`),{status:500,code:"TRUST_STATE_PERSISTENCE_FAILED"});}

export function trustStateRepository(){const db=createServiceRoleClient();return {
  async forRecommendation(enterpriseId:string,recommendationId:string){const result=await db.from("trust_state_decisions").select("state_decision_id,decision_contract_id,prior_state,next_state,decision_hash,decided_at,reason_codes").eq("enterprise_id",enterpriseId).eq("recommendation_id",recommendationId).maybeSingle();if(result.error)fail("Recommendation state decision",result.error);return result.data;},
  async current(enterpriseId:string,subjectId:string){const result=await db.from("subject_trust_state").select("state,current_state_decision_id,updated_at").eq("enterprise_id",enterpriseId).eq("subject_id",subjectId).maybeSingle();if(result.error)fail("Current trust state",result.error);return result.data?{state:String(result.data.state) as TrustState,stateDecisionId:result.data.current_state_decision_id?String(result.data.current_state_decision_id):null,updatedAt:String(result.data.updated_at)}:null;},
  async chainHead(enterpriseId:string){const result=await db.from("trust_event_chain_heads").select("last_sequence,last_event_hash").eq("enterprise_id",enterpriseId).eq("partition_key","default").maybeSingle();if(result.error)fail("Trust State chain head",result.error);return {sequence:Number(result.data?.last_sequence??0),eventHash:result.data?.last_event_hash?String(result.data.last_event_hash):null};},
  async apply(contract:TrustDecisionContract,decision:TrustStateDecision,event:CanonicalTrustEvent,correlationId:string){const result=await db.rpc("apply_trust_state_decision_v1",{p_contract:contract,p_decision:decision,p_trust_event:event,p_correlation_id:correlationId});if(result.error){if(/event chain conflict/i.test(result.error.message))return {status:"CHAIN_CONFLICT" as const};if(/compare-and-set conflict/i.test(result.error.message))return {status:"STATE_CONFLICT" as const};fail("Trust State decision",result.error);}return result.data as {status:"APPLIED";stateDecisionId:string;state:TrustState};},
};}
