import { publishTrustEvent } from "@/lib/events/event-bus";
import { getTrustCache, updateReplaySafeTrustCache } from "@/lib/cache/trust-cache";
import type { TrustAlgorithmDecision } from "@/lib/trust/trust-algorithm";

export type RuntimeTrustPosture = {
  subject_id: string;
  trust_score: number;
  posture: "trusted" | "reviewable" | "elevated" | "restricted";
  decision: TrustAlgorithmDecision;
  drift: number;
  updated_at: string;
  source: "Runtime Intelligence";
  evidence_refs: string[];
};

function postureFor(score: number): RuntimeTrustPosture["posture"] {
  return score >= 80 ? "trusted" : score >= 65 ? "reviewable" : score >= 45 ? "elevated" : "restricted";
}

export function updateRuntimeTrustPosture(input: {
  subjectId: string;
  trustScore: number;
  decision: TrustAlgorithmDecision;
  evidenceRefs?: string[];
}) {
  const previous = getTrustCache<RuntimeTrustPosture>("trust_posture", input.subjectId)?.value;
  const posture = updateReplaySafeTrustCache<RuntimeTrustPosture>("trust_posture", input.subjectId, () => ({
    subject_id: input.subjectId,
    trust_score: input.trustScore,
    posture: postureFor(input.trustScore),
    decision: input.decision,
    drift: previous ? Number((input.trustScore - previous.trust_score).toFixed(2)) : 0,
    updated_at: new Date().toISOString(),
    source: "Runtime Intelligence",
    evidence_refs: [...(input.evidenceRefs ?? [])],
  }), { ttlMs: 60_000 });

  publishTrustEvent("trust.updated", { subject_id: input.subjectId, trust_score: input.trustScore, decision: input.decision }, { replaySafe: true });
  return posture;
}
