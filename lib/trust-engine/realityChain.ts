import {
  demoOriginDNARecords,
  getSyntheticProbability,
  type OriginDNARecord,
  type TransformationEvent,
} from "@/lib/trust-engine/originDNA";

export type RealityDrift = "low" | "medium" | "high" | "critical";

export type RealityChainStep = {
  id: string;
  event: TransformationEvent;
  label: string;
  timestamp: string;
  confidence_after_event: number;
};

export type RealityChainSummary = {
  subject_name: string;
  reality_drift: RealityDrift;
  origin_confidence: number;
  generation_chain: string[];
  synthetic_indicators: string[];
  human_presence_impact: string;
  evidence_links: string[];
  related_signals: string[];
  steps: RealityChainStep[];
};

const eventLabels: Record<TransformationEvent, string> = {
  uploaded: "Uploaded",
  cropped: "Cropped",
  recompressed: "Recompressed",
  voice_modified: "Voice altered",
  image_modified: "Image modified",
  video_modified: "Video edited",
  model_generated: "Model generated",
  model_enhanced: "Model enhanced",
  metadata_removed: "Metadata removed",
  reuploaded: "Reuploaded",
};

function driftFrom(record: OriginDNARecord): RealityDrift {
  const syntheticProbability = getSyntheticProbability(record);
  const driftScore =
    (100 - record.provenance_confidence) +
    record.generation_count * 18 +
    record.edited_count * 8 +
    record.transformation_events.length * 5 +
    (syntheticProbability >= 70 ? 20 : 0);

  if (driftScore >= 100) return "critical";
  if (driftScore >= 70) return "high";
  if (driftScore >= 40) return "medium";

  return "low";
}

export function createRealityChain(record: OriginDNARecord): RealityChainSummary {
  const syntheticProbability = getSyntheticProbability(record);
  const steps = record.transformation_events.map((event, index) => ({
    id: `${record.id}-${index}`,
    event,
    label: eventLabels[event],
    timestamp: index === 0 ? record.first_seen : record.last_seen,
    confidence_after_event: Math.max(
      0,
      Math.round(record.provenance_confidence - index * 4)
    ),
  }));
  const generationChain = [
    `${record.capture_type} capture`,
    ...record.transformation_events.map((event) => eventLabels[event]),
    `${record.reality_state} state`,
  ];
  const syntheticIndicators = [
    ...(record.ai_model_fingerprint
      ? [`AI model fingerprint: ${record.ai_model_fingerprint}`]
      : []),
    ...(record.voice_clone_probability >= 50
      ? [`Voice clone probability ${record.voice_clone_probability}%`]
      : []),
    ...(record.video_synthetic_probability >= 50
      ? [`Video synthetic probability ${record.video_synthetic_probability}%`]
      : []),
    ...(record.image_synthetic_probability >= 50
      ? [`Image synthetic probability ${record.image_synthetic_probability}%`]
      : []),
    ...(syntheticProbability >= 60
      ? [`Composite synthetic probability ${syntheticProbability}%`]
      : []),
  ];

  return {
    subject_name: record.subject_name,
    reality_drift: driftFrom(record),
    origin_confidence: record.provenance_confidence,
    generation_chain: generationChain,
    synthetic_indicators: syntheticIndicators.length
      ? syntheticIndicators
      : ["No major synthetic indicator in demo chain"],
    human_presence_impact:
      record.voice_clone_probability >= 70 || record.video_synthetic_probability >= 70
        ? "High impact: liveness and voice/video checks should be repeated."
        : record.provenance_confidence < 60
          ? "Medium impact: request more evidence before permission."
          : "Low impact: no immediate Human Presence degradation.",
    evidence_links: ["/evidence-vault", "/origin-trace", "/reality-passport"],
    related_signals: [
      "origin_dna_created",
      ...(record.provenance_confidence < 60
        ? ["origin_confidence_dropped", "reality_drift_detected"]
        : ["reality_chain_changed"]),
      ...(syntheticProbability >= 65 ? ["synthetic_generation_detected"] : []),
    ],
    steps,
  };
}

export const demoRealityChains = demoOriginDNARecords.map(createRealityChain);
