export const HEURISTIC_SIGNAL_LABEL = "Heuristic rule-based signal" as const;

export const detectionProviderRequirements = [
  { id: "deepfake_api", name: "Deepfake Detection API", env: ["DEEPFAKE_DETECTION_API_KEY"], module: "deepfake_image_video" },
  { id: "voice_api", name: "Voice Detection API", env: ["VOICE_DETECTION_API_KEY"], module: "synthetic_voice" },
  { id: "document_forensics", name: "Document Forensics API", env: ["DOCUMENT_FORENSICS_API_KEY"], module: "forged_documents" },
  { id: "reality_defender", name: "Reality Defender", env: ["REALITY_DEFENDER_API_KEY"], module: "deepfake_image_video" },
  { id: "pindrop", name: "Pindrop", env: ["PINDROP_API_KEY"], module: "synthetic_voice" },
  { id: "sensity", name: "Sensity", env: ["SENSITY_API_KEY"], module: "deepfake_image_video" },
  { id: "veriff", name: "Veriff", env: ["VERIFF_API_KEY"], module: "identity_verification" },
  { id: "onfido", name: "Onfido", env: ["ONFIDO_API_KEY"], module: "identity_verification" },
  { id: "hopae", name: "Hopae", env: ["HOPAE_API_KEY"], module: "identity_verification" },
  { id: "world_id", name: "World ID", env: ["WORLD_ID_APP_ID", "WORLD_ID_ACTION"], module: "identity_verification" },
  { id: "stripe", name: "Stripe", env: ["STRIPE_SECRET_KEY"], module: "payments" },
  { id: "turnstile", name: "Cloudflare Turnstile", env: ["TURNSTILE_SECRET_KEY"], module: "bot_protection" },
] as const;

export type DetectionSource =
  | "Provider API"
  | "Heuristic Rules"
  | "Demo Data"
  | "Real ML"
  | "Not Implemented"
  | "Awaiting Credentials";

export type HeuristicDetectionInput = {
  riskyIpOrDeviceChange?: boolean;
  impossibleSessionVelocity?: boolean;
  repeatedFailedVerification?: boolean;
  missingProvenance?: boolean;
  virtualCameraPlaceholder?: boolean;
  emulatorOrTamperedAppPlaceholder?: boolean;
  suspiciousAgentRuntimeBehavior?: boolean;
  failedProviderChecks?: boolean;
};

export type DetectionModuleStatus = {
  id: string;
  name: string;
  status: "Active" | "Review Only" | "Awaiting Credentials" | "Not Implemented";
  implementation_type: "provider" | "heuristic" | "workflow" | "placeholder";
  source: DetectionSource;
  warning?: string;
};

const implementedProviderAdapters = new Set(["hopae", "stripe", "turnstile"]);
const envPresent = (name: string) => Boolean(String(process.env[name] ?? "").trim());

export function classifyDetectionSource(input: {
  realMl?: boolean;
  providerBacked?: boolean;
  heuristic?: boolean;
  demo?: boolean;
}): DetectionSource {
  if (input.realMl) return "Real ML";
  if (input.providerBacked) return "Provider API";
  if (input.heuristic) return "Heuristic Rules";
  if (input.demo) return "Demo Data";
  return "Not Implemented";
}

export function normalizeDetectionSource(value: unknown): DetectionSource {
  const source = String(value ?? "").trim();
  const canonical: DetectionSource[] = [
    "Real ML",
    "Provider API",
    "Heuristic Rules",
    "Demo Data",
    "Awaiting Credentials",
    "Not Implemented",
  ];
  if (canonical.includes(source as DetectionSource)) return source as DetectionSource;
  if (/demo|mock|sample|simulation|fixture/i.test(source)) return "Demo Data";
  if (/provider|world.?id|hopae|onfido|veriff|persona|entrust/i.test(source)) return "Provider API";
  if (/rule|heuristic|operator|workflow|api\.|session_integrity_review_form/i.test(source)) return "Heuristic Rules";
  if (/placeholder|pending credential/i.test(source)) return "Awaiting Credentials";
  return "Not Implemented";
}

export function calculateTrustScoreSource(input: {
  realMl?: boolean;
  providerSignals?: number;
  heuristicSignals?: number;
  demo?: boolean;
} = {}): DetectionSource {
  return classifyDetectionSource({
    realMl: input.realMl,
    providerBacked: Boolean(input.providerSignals),
    heuristic: Boolean(input.heuristicSignals),
    demo: input.demo,
  });
}

export function runHeuristicDetection(input: HeuristicDetectionInput) {
  const labels: Record<keyof HeuristicDetectionInput, string> = {
    riskyIpOrDeviceChange: "Risky IP or device change",
    impossibleSessionVelocity: "Impossible session velocity",
    repeatedFailedVerification: "Repeated failed verification",
    missingProvenance: "Missing provenance",
    virtualCameraPlaceholder: "Virtual camera placeholder",
    emulatorOrTamperedAppPlaceholder: "Emulator or tampered-app placeholder",
    suspiciousAgentRuntimeBehavior: "Suspicious agent runtime behavior",
    failedProviderChecks: "Failed provider checks",
  };

  return (Object.keys(labels) as Array<keyof HeuristicDetectionInput>)
    .filter((key) => input[key] === true)
    .map((key) => ({
      id: key,
      label: labels[key],
      source: HEURISTIC_SIGNAL_LABEL,
      requires_manual_review: true,
      is_final_verdict: false,
    }));
}

export function generateDetectionWarning(input: { source?: DetectionSource; claim?: string }) {
  if (input.source === "Real ML" || input.source === "Provider API") {
    return "Provider or model output is review evidence, not an automatic authenticity verdict.";
  }
  if (/ai detected|confirmed fake|real ml/i.test(input.claim ?? "")) {
    return "Claim exceeds implementation: no verified model or provider inference supports this wording.";
  }
  return "Heuristic rule-based signal. Human governance review remains authoritative.";
}

export function getDetectionEngineStatus() {
  const providers = detectionProviderRequirements.map((provider) => {
    const missing_env = provider.env.filter((name) => !envPresent(name));
    const credentials_present = missing_env.length === 0;
    const adapter_implemented = implementedProviderAdapters.has(provider.id);
    const active = credentials_present && adapter_implemented;
    return {
      id: provider.id,
      name: provider.name,
      module: provider.module,
      active,
      adapter_implemented,
      credentials_present,
      runtime_state: active ? "Live" : missing_env.length ? "Awaiting Credentials" : "Disabled",
      missing_env,
    };
  });

  const modules: DetectionModuleStatus[] = [
    { id: "deepfake_image_video", name: "Deepfake image/video detection", status: "Not Implemented", implementation_type: "placeholder", source: "Not Implemented", warning: "No model inference or provider adapter is implemented." },
    { id: "synthetic_voice", name: "Synthetic voice detection", status: "Not Implemented", implementation_type: "placeholder", source: "Not Implemented", warning: "No voice-forensics inference or provider adapter is implemented." },
    { id: "forged_documents", name: "Forged document detection", status: "Not Implemented", implementation_type: "placeholder", source: "Not Implemented", warning: "Document provenance fields are review context, not forensic detection." },
    { id: "session_injection", name: "Session and injection integrity", status: "Active", implementation_type: "heuristic", source: "Heuristic Rules" },
    { id: "behavioral_anomalies", name: "Behavioral anomalies", status: "Review Only", implementation_type: "heuristic", source: "Heuristic Rules" },
    { id: "identity_verification", name: "Identity verification orchestration", status: providers.some((provider) => provider.active && provider.module === "identity_verification") ? "Active" : "Awaiting Credentials", implementation_type: "provider", source: "Provider API" },
    { id: "agent_verification", name: "AI agent verification and governance", status: "Active", implementation_type: "workflow", source: "Heuristic Rules" },
    { id: "provenance", name: "Provenance checks", status: "Review Only", implementation_type: "workflow", source: "Heuristic Rules" },
    { id: "trust_score", name: "Trust score calculation", status: "Active", implementation_type: "heuristic", source: "Heuristic Rules" },
    { id: "blocking", name: "Block, remove, escalate and preserve evidence", status: "Active", implementation_type: "workflow", source: "Heuristic Rules" },
  ];

  return {
    schema_version: 1,
    real_ml_enabled: false,
    provider_detection_enabled: providers.some((provider) => provider.active && ["deepfake_image_video", "synthetic_voice", "forged_documents"].includes(provider.module)),
    heuristic_detection_enabled: true,
    mock_data_present: true,
    validation_dataset_present: false,
    false_positive_tracking_present: true,
    false_negative_tracking_present: true,
    active_providers: providers.filter((provider) => provider.active),
    missing_providers: providers.filter((provider) => !provider.active),
    providers,
    detection_modules: modules,
    trust_score_source: "Heuristic Rules" as DetectionSource,
    warnings: [
      "No confirmed ML detection unless a verified model or implemented provider inference exists.",
      "Configured credentials do not prove that a provider adapter, health check or accuracy validation exists.",
      "Demo and placeholder risk values must not be presented as live detection.",
    ],
  };
}
