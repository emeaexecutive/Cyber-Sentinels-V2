export const captureTypes = [
  "camera",
  "screen_recording",
  "upload",
  "api_ingest",
  "model_output",
  "scanner",
  "unknown",
] as const;

export const realityStates = [
  "original",
  "modified",
  "enhanced",
  "synthetic_assisted",
  "synthetic_generated",
  "unknown",
] as const;

export const transformationEvents = [
  "uploaded",
  "cropped",
  "recompressed",
  "voice_modified",
  "image_modified",
  "video_modified",
  "model_generated",
  "model_enhanced",
  "metadata_removed",
  "reuploaded",
] as const;

export const originDNASignals = [
  "origin_dna_created",
  "reality_chain_changed",
  "synthetic_generation_detected",
  "origin_confidence_dropped",
  "reality_drift_detected",
] as const;

export const originDNAAuditEvents = [
  "origin_analysis_created",
  "reality_chain_updated",
] as const;

export type RealityState = (typeof realityStates)[number];
export type TransformationEvent = (typeof transformationEvents)[number];

export type OriginDNARecord = {
  id: string;
  subject_name: string;
  subject_type: "media" | "person" | "ai_agent" | "evidence";
  media_type: "video" | "audio" | "image" | "document" | "profile";
  source: string;
  capture_type: (typeof captureTypes)[number];
  upload_device: string;
  file_hash: string;
  compression_signature: string;
  ai_model_fingerprint: string | null;
  generation_count: number;
  edited_count: number;
  voice_clone_probability: number;
  video_synthetic_probability: number;
  image_synthetic_probability: number;
  transformation_events: TransformationEvent[];
  first_seen: string;
  last_seen: string;
  provenance_confidence: number;
  reality_state: RealityState;
};

export type OriginAnalysisInput = {
  subject_type?: string | null;
  media_type?: string | null;
  hash?: string | null;
  metadata?: {
    source?: string | null;
    capture_type?: string | null;
    upload_device?: string | null;
    compression_signature?: string | null;
    ai_model_fingerprint?: string | null;
    transformation_events?: string[] | null;
    generation_count?: number | null;
    edited_count?: number | null;
  } | null;
};

export type OriginAnalysisResult = {
  origin_confidence: number;
  reality_state: RealityState;
  synthetic_probability: number;
  transformation_count: number;
  recommended_action: "allow" | "monitor" | "manual_review" | "step_up_required";
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function validTransformations(values: string[] | null | undefined) {
  return (values ?? []).filter((value): value is TransformationEvent =>
    transformationEvents.includes(value as TransformationEvent)
  );
}

export function getSyntheticProbability(record: Pick<
  OriginDNARecord,
  | "voice_clone_probability"
  | "video_synthetic_probability"
  | "image_synthetic_probability"
  | "generation_count"
  | "ai_model_fingerprint"
>) {
  const observed = Math.max(
    record.voice_clone_probability,
    record.video_synthetic_probability,
    record.image_synthetic_probability
  );
  const generatedBoost = record.generation_count > 0 ? 20 : 0;
  const modelBoost = record.ai_model_fingerprint ? 15 : 0;

  return clampScore(Math.max(observed, observed + generatedBoost + modelBoost));
}

export function inferRealityState(
  events: TransformationEvent[],
  syntheticProbability: number
): RealityState {
  if (events.includes("model_generated") || syntheticProbability >= 80) {
    return "synthetic_generated";
  }

  if (events.includes("model_enhanced") || syntheticProbability >= 55) {
    return "synthetic_assisted";
  }

  if (events.some((event) => event.endsWith("_modified"))) {
    return "modified";
  }

  if (events.includes("cropped") || events.includes("recompressed")) {
    return "enhanced";
  }

  return events.includes("uploaded") ? "original" : "unknown";
}

export function analyzeOriginDNA(input: OriginAnalysisInput): OriginAnalysisResult {
  const metadata = input.metadata ?? {};
  const events = validTransformations(metadata.transformation_events);
  const generationCount =
    typeof metadata.generation_count === "number" ? metadata.generation_count : 0;
  const editedCount =
    typeof metadata.edited_count === "number" ? metadata.edited_count : 0;
  const syntheticProbability = clampScore(
    generationCount * 30 +
      editedCount * 8 +
      (metadata.ai_model_fingerprint ? 25 : 0) +
      (events.includes("model_generated") ? 40 : 0) +
      (events.includes("voice_modified") ? 18 : 0) +
      (events.includes("metadata_removed") ? 12 : 0)
  );
  const realityState = inferRealityState(events, syntheticProbability);
  const provenanceConfidence = clampScore(
    92 -
      events.length * 7 -
      generationCount * 18 -
      editedCount * 5 -
      (metadata.source ? 0 : 15) -
      (input.hash ? 0 : 20) -
      (events.includes("metadata_removed") ? 18 : 0)
  );

  const recommendedAction =
    provenanceConfidence < 45 || syntheticProbability >= 75
      ? "manual_review"
      : provenanceConfidence < 65 || syntheticProbability >= 55
        ? "step_up_required"
        : events.length > 2
          ? "monitor"
          : "allow";

  return {
    origin_confidence: provenanceConfidence,
    reality_state: realityState,
    synthetic_probability: syntheticProbability,
    transformation_count: events.length,
    recommended_action: recommendedAction,
  };
}

export const demoOriginDNARecords: OriginDNARecord[] = [
  {
    id: "origin-ceo-video",
    subject_name: "CEO video uploaded",
    subject_type: "media",
    media_type: "video",
    source: "Partner upload portal",
    capture_type: "upload",
    upload_device: "Unknown browser device",
    file_hash: "sha256:demo-ceo-video",
    compression_signature: "h264-double-compression",
    ai_model_fingerprint: "possible_voice_model_v2",
    generation_count: 1,
    edited_count: 3,
    voice_clone_probability: 78,
    video_synthetic_probability: 61,
    image_synthetic_probability: 22,
    transformation_events: [
      "uploaded",
      "video_modified",
      "voice_modified",
      "recompressed",
      "reuploaded",
    ],
    first_seen: "2026-05-21T09:30:00.000Z",
    last_seen: "2026-05-25T11:10:00.000Z",
    provenance_confidence: 42,
    reality_state: "synthetic_assisted",
  },
  {
    id: "origin-agent-evidence",
    subject_name: "Evidence Vault classifier output",
    subject_type: "ai_agent",
    media_type: "document",
    source: "Evidence Vault",
    capture_type: "api_ingest",
    upload_device: "Server pipeline",
    file_hash: "sha256:demo-agent-log",
    compression_signature: "none",
    ai_model_fingerprint: "classifier_demo_v1",
    generation_count: 0,
    edited_count: 0,
    voice_clone_probability: 0,
    video_synthetic_probability: 0,
    image_synthetic_probability: 0,
    transformation_events: ["uploaded"],
    first_seen: "2026-05-24T14:00:00.000Z",
    last_seen: "2026-05-24T14:04:00.000Z",
    provenance_confidence: 88,
    reality_state: "original",
  },
  {
    id: "origin-candidate-profile",
    subject_name: "Candidate profile image",
    subject_type: "person",
    media_type: "image",
    source: "Candidate public profile",
    capture_type: "upload",
    upload_device: "Mobile browser",
    file_hash: "sha256:demo-profile-image",
    compression_signature: "jpeg-social-recompression",
    ai_model_fingerprint: null,
    generation_count: 0,
    edited_count: 1,
    voice_clone_probability: 0,
    video_synthetic_probability: 0,
    image_synthetic_probability: 34,
    transformation_events: ["uploaded", "cropped", "recompressed"],
    first_seen: "2026-05-22T16:20:00.000Z",
    last_seen: "2026-05-25T08:45:00.000Z",
    provenance_confidence: 71,
    reality_state: "enhanced",
  },
];
