import { hashCanonical,deterministicUuid } from "../trust-core/hash.ts";
export const replayModes=["HISTORICAL_REPLAY","POLICY_SIMULATION","PROVIDER_OUTAGE_SIMULATION","EVIDENCE_EXCLUSION_SIMULATION","TRUST_STATE_TRANSITION_REPLAY","CONSENT_STATE_REPLAY","AUTHORITY_LINEAGE_REPLAY"] as const;
export type ReplayMode=(typeof replayModes)[number];
export function buildReplayArtifact(input:{mode:ReplayMode;enterpriseId:string;decisionId:string;historicalInputs:Record<string,unknown>;simulationOverrides?:Record<string,unknown>}){const replayedAt=new Date().toISOString();const payload={...input,replayedAt,mutatesProduction:false as const};const replayHash=hashCanonical(payload);return {...payload,replayId:deterministicUuid({replayHash}),replayHash};}
