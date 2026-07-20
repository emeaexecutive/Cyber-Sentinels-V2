import { canonicalizeJson } from "../trust-events/canonicalize.ts";
import { sha256Hex } from "../trust-events/hash.ts";
import type { ConsensusDecision } from "./types.ts";

export function hashEvidenceSnapshot(observationIds: string[]) { return sha256Hex(canonicalizeJson([...observationIds].sort())); }
export function hashConsensusDecision(decision: Omit<ConsensusDecision, "decisionHash">) { return sha256Hex(canonicalizeJson(decision)); }
export function verifyConsensusDecision(decision: ConsensusDecision) { const { decisionHash, ...unsigned } = decision; return decisionHash === hashConsensusDecision(unsigned); }
