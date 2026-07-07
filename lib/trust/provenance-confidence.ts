export type ProvenanceSignalState = "present" | "missing" | "placeholder" | "not_supported";

export type ProvenanceConfidenceInput = {
  c2pa?: ProvenanceSignalState;
  synthId?: ProvenanceSignalState;
  aiDisclosure?: "declared" | "not_declared" | "unknown";
  evidenceTimelineCount?: number;
};

export function evaluateProvenanceConfidence(input: ProvenanceConfidenceInput = {}) {
  const c2pa = input.c2pa ?? "placeholder";
  const synthId = input.synthId ?? "placeholder";
  const aiDisclosure = input.aiDisclosure ?? "unknown";
  const timelineCount = Math.max(0, Math.round(input.evidenceTimelineCount ?? 0));
  const presentCount = [c2pa, synthId].filter((state) => state === "present").length;
  const missingCount = [c2pa, synthId].filter((state) => state === "missing").length;
  const confidence = Math.max(
    0,
    Math.min(1, 0.35 + presentCount * 0.2 + Math.min(0.2, timelineCount * 0.04) - missingCount * 0.1)
  );

  return {
    source: "Heuristic Baseline" as const,
    confidence: Number(confidence.toFixed(2)),
    c2pa,
    synthId,
    aiDisclosure,
    evidenceTimelineCount: timelineCount,
    warnings: [
      "Missing provenance does not mean fake.",
      "Present provenance does not guarantee real.",
      "Provenance is one signal in trust orchestration and requires governance review.",
    ],
    exportableAuditSummary: {
      c2pa,
      synthId,
      aiDisclosure,
      confidence: Number(confidence.toFixed(2)),
      governanceAlert:
        c2pa === "missing" || synthId === "missing" || aiDisclosure === "unknown"
          ? "Review provenance gaps before relying on this workflow."
          : "Review provenance claims with retained evidence before relying on this workflow.",
    },
  };
}
