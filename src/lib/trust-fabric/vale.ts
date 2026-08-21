import type {
  CanonicalTrustTransactionDependencies,
  CanonicalTrustTransactionInput,
  SafeCanonicalTransactionReceipt,
} from "../trust-transaction/canonical.ts";
import { executeCanonicalTrustTransaction } from "../trust-transaction/canonical.ts";
import { hashCanonical } from "../trust-core/hash.ts";

export const VALE_ARCHITECTURE = [
  "VERIFIED_ACTOR",
  "AUTHORITY_LINEAGE",
  "CAPABILITY",
  "INTENT",
  "MONITORING",
  "EXECUTION",
  "CONSEQUENCE",
  "EVIDENCE",
] as const;

/** VALE derives context only; canonical Trust Fabric services own artifacts. */
export const VALE_CANONICAL_OWNERSHIP = {
  VALE_FINAL_DECISION_ENGINE: "canonical",
  VALE_RECEIPT: "canonical receipt",
  VALE_GRAPH: "canonical Evidence Graph",
  VALE_REPLAY: "canonical Replay",
  VALE_MEMORY: "canonical Trust Memory",
} as const;

export type ValeActorType =
  | "HUMAN"
  | "EMPLOYEE"
  | "CONTRACTOR"
  | "PRIVILEGED_OPERATOR"
  | "AI_AGENT"
  | "SUB_AGENT"
  | "AGENT_SWARM"
  | "NHI"
  | "SERVICE_ACCOUNT"
  | "ROBOT"
  | "COBOT"
  | "DRONE"
  | "AUTONOMOUS_MACHINE"
  | "EDGE_AI_DEVICE";

export type ValeActor = {
  operationalEntityId: string;
  type: ValeActorType;
  role: string;
  accountablePrincipalId: string;
  authorityReference?: string | null;
  delegationReference?: string | null;
};

export type ValePhysicalAction =
  | "MOVE" | "NAVIGATE" | "MANIPULATE" | "PICK" | "PLACE"
  | "OPEN" | "CLOSE" | "LOCK" | "UNLOCK" | "LIFT"
  | "ACCELERATE" | "BRAKE" | "LAND" | "TAKE_OFF" | "ACTUATE"
  | "EMERGENCY_STOP" | (string & {});

export type ValeIntent = {
  action: ValePhysicalAction;
  resource: string;
  purpose: string;
  environment: string;
  destination?: string | null;
  zone?: string | null;
  asset?: string | null;
  payload?: string | null;
  maxSpeedMps?: number | null;
  maxForceNewtons?: number | null;
  mission?: string | null;
  tool?: string | null;
  signedBy: string;
  signedAt: string;
  signatureReference: string;
};

export type ValeMachineEvidence = {
  identityState: "MACHINE_IDENTITY_VERIFIED" | "MACHINE_IDENTITY_CHANGED" | "MACHINE_IDENTITY_UNPROVEN";
  attestationState: "CURRENT" | "ATTESTATION_STALE" | "ATTESTATION_INVALID" | "MACHINE_IDENTITY_UNPROVEN";
  deviceCertificateReference?: string | null;
  hardwareIdentityReference?: string | null;
  firmwareHash?: string | null;
  softwareVersion?: string | null;
  runtimeIdentity?: string | null;
  deploymentIdentity?: string | null;
};

export type ValeModelEvidence = {
  provider: string;
  family?: string | null;
  modelId: string;
  version: string;
  weightsHash?: string | null;
  fineTuneReference?: string | null;
  deploymentHash?: string | null;
  runtime?: string | null;
  quantization?: string | null;
  toolConfiguration?: string[];
  policyVersion?: string | null;
  evaluationEnvironment?: string | null;
  knownLimitations?: string[];
  drift?: Array<"MODEL_DRIFT" | "BEHAVIOR_DRIFT" | "DATA_DRIFT" | "FEATURE_DRIFT" | "CALIBRATION_DRIFT" | "CAPABILITY_DRIFT" | "TOOL_BEHAVIOR_DRIFT">;
  confidence?: number | null;
  calibrationReference?: string | null;
  uncertaintyMethod?: string | null;
  outOfDistributionEvidence?: string | null;
};

export type ValeSensorEvidence = {
  source: string;
  observationClass: "WORLD_STATE" | "MODEL_PERCEPTION" | "INDEPENDENT_OBSERVATION";
  observation: string;
  observedAt: string;
  digest: string;
  freshness: "current" | "stale" | "unavailable";
};

export type ValeExecutionStage =
  | "INTENDED_ACTION"
  | "REQUESTED_ACTION"
  | "AUTHORIZED_ACTION"
  | "COMMAND_SENT"
  | "COMMAND_ACKNOWLEDGED"
  | "ACTION_EXECUTED"
  | "WORLD_STATE_CHANGED"
  | "CONSEQUENCE_OBSERVED";

export type ValeTrustInput = {
  tenantId: string;
  actorLineage: ValeActor[];
  intent: ValeIntent;
  machine: ValeMachineEvidence;
  model: ValeModelEvidence;
  monitoring: {
    expectedProviders: string[];
    observedProviders: string[];
    telemetryGapSeconds: number;
    connection: "CONNECTED" | "INTERMITTENT" | "OFFLINE";
    cachedPolicyVersion?: string | null;
  };
  sensors: ValeSensorEvidence[];
  execution: {
    commandTarget?: string | null;
    stages: Array<{ stage: ValeExecutionStage; status: "observed" | "asserted" | "missing"; occurredAt?: string | null; evidenceReference?: string | null }>;
    consequence?: string | null;
  };
  oversight: "HUMAN_IN_THE_LOOP" | "HUMAN_ON_THE_LOOP" | "HUMAN_OVER_THE_LOOP" | "AUTONOMOUS";
  conflicts?: string[];
  adversarialSignals?: Array<
    "PROMPT_INJECTION" | "TOOL_INJECTION" | "MODEL_EVASION" | "ADVERSARIAL_INPUT"
    | "DATA_POISONING_SUSPECTED" | "MODEL_EXTRACTION_ATTEMPT" | "AGENT_IMPERSONATION"
    | "CREDENTIAL_THEFT_SIGNAL" | "SENSOR_SPOOFING" | "GPS_SPOOFING" | "VISION_SPOOFING"
  >;
  evidenceMode?: "SIMULATED_EVIDENCE" | "REAL_WORLD_EVIDENCE";
  idempotencyKey: string;
  requestedAt?: string;
};

export type ValeCanonicalProjection = {
  architecture: typeof VALE_ARCHITECTURE;
  canonicalTransactionInput: CanonicalTrustTransactionInput;
  evidenceTypes: string[];
};

function terminalSubjectType(type: ValeActorType): "human" | "ai_agent" | "machine_identity" {
  if (["HUMAN", "EMPLOYEE", "CONTRACTOR", "PRIVILEGED_OPERATOR"].includes(type)) return "human";
  if (["AI_AGENT", "SUB_AGENT", "AGENT_SWARM", "NHI", "SERVICE_ACCOUNT"].includes(type)) return "ai_agent";
  return "machine_identity";
}

function deriveValeEvidenceTypes(input: ValeTrustInput) {
  const evidence = new Set<string>();
  evidence.add(input.machine.identityState);
  evidence.add(input.machine.attestationState);
  for (const drift of input.model.drift ?? []) evidence.add(drift);
  for (const signal of input.adversarialSignals ?? []) evidence.add(signal);
  for (const conflict of input.conflicts ?? []) evidence.add(conflict);
  if (input.execution.commandTarget && input.intent.destination && input.execution.commandTarget !== input.intent.destination) evidence.add("INTENT_EXECUTION_MISMATCH");
  if (input.monitoring.expectedProviders.some((provider) => !input.monitoring.observedProviders.includes(provider))) evidence.add("MONITORING_COVERAGE_GAP");
  if (input.monitoring.telemetryGapSeconds > 0 && input.execution.stages.some((stage) => ["COMMAND_SENT", "ACTION_EXECUTED", "WORLD_STATE_CHANGED", "CONSEQUENCE_OBSERVED"].includes(stage.stage))) evidence.add("ACTION_DURING_EVIDENCE_GAP");
  if (input.monitoring.connection === "OFFLINE") evidence.add("OFFLINE_EVIDENCE_GAP");
  if (input.evidenceMode === "SIMULATED_EVIDENCE") evidence.add("REAL_WORLD_REVALIDATION_REQUIRED");
  for (const sensor of input.sensors) {
    if (sensor.freshness === "stale") evidence.add("SENSOR_STALE");
    if (sensor.freshness === "unavailable") evidence.add("SENSOR_UNAVAILABLE");
  }
  const distinctObservations = new Set(input.sensors.filter((sensor) => sensor.freshness === "current").map((sensor) => sensor.observation));
  if (distinctObservations.size > 1) evidence.add("SENSOR_DISAGREEMENT");
  if (!input.sensors.length) evidence.add("WORLD_STATE_UNVERIFIED");
  return [...evidence].sort();
}

export function projectValeContext(input: ValeTrustInput): ValeCanonicalProjection {
  if (!input.actorLineage.length) throw new TypeError("VALE actor lineage requires at least one Operational Entity.");
  const terminalActor = input.actorLineage.at(-1)!;
  const evidenceTypes = deriveValeEvidenceTypes(input);
  const payloadDigest = hashCanonical({
    actorLineage: input.actorLineage,
    intent: input.intent,
    machine: input.machine,
    model: input.model,
    monitoring: input.monitoring,
    sensors: input.sensors,
    execution: input.execution,
    oversight: input.oversight,
    evidenceMode: input.evidenceMode ?? "REAL_WORLD_EVIDENCE",
  });
  const monitoringCoverage = input.monitoring.expectedProviders.length > 0
    && input.monitoring.expectedProviders.every((provider) => input.monitoring.observedProviders.includes(provider))
    ? "covered"
    : input.monitoring.observedProviders.length > 0 ? "partial" : "not_observed";

  return {
    architecture: VALE_ARCHITECTURE,
    evidenceTypes,
    canonicalTransactionInput: {
      trustObject: { subjectType: terminalSubjectType(terminalActor.type), subjectId: terminalActor.operationalEntityId },
      operationalEntityId: terminalActor.operationalEntityId,
      action: {
        type: input.intent.action,
        purpose: input.intent.purpose,
        resource: input.intent.resource,
        environment: input.intent.environment,
        payloadDigest,
      },
      idempotencyKey: input.idempotencyKey,
      requestedAt: input.requestedAt,
      managedControl: {
        responsibilityLineage: {
          businessOwner: terminalActor.accountablePrincipalId,
          controlOwner: input.intent.signedBy,
          controlOperator: terminalActor.operationalEntityId,
          runtimeProvider: input.monitoring.observedProviders[0] ?? "runtime:not_observed",
          destinationSystem: input.intent.destination ?? input.intent.resource,
          evidenceProvider: input.sensors[0]?.source ?? input.monitoring.observedProviders[0] ?? "evidence:not_observed",
        },
        contradictions: evidenceTypes,
        humanIntent: { signed: true, status: "provided", reference: input.intent.signatureReference },
        monitoringCoverage,
        oversightMode: input.oversight,
        executionStages: input.execution.stages.map((stage) => ({
          ...stage,
          occurredAt: stage.occurredAt ?? null,
          evidenceReference: stage.evidenceReference ?? null,
        })),
        contextEvidence: evidenceTypes.map((evidenceType) => ({
          providerClass: evidenceType.includes("SENSOR") || evidenceType.includes("WORLD_STATE") ? "SENSOR_EVIDENCE_PROVIDER" : "ROBOTICS_RUNTIME_PROVIDER",
          providerKey: evidenceType.includes("SENSOR") ? input.sensors[0]?.source ?? "sensor:unattributed" : input.monitoring.observedProviders[0] ?? "vale:context-projection",
          evidenceType,
          observedAt: input.requestedAt ?? input.intent.signedAt,
          outcome: "OBSERVED",
          evidenceDigest: hashCanonical({ evidenceType, payloadDigest }),
          metadata: { evidenceMode: input.evidenceMode ?? "REAL_WORLD_EVIDENCE" },
        })),
      },
    },
  };
}

export function authorizeValeTrust(
  input: ValeTrustInput,
  dependencies: CanonicalTrustTransactionDependencies,
): Promise<SafeCanonicalTransactionReceipt> {
  return executeCanonicalTrustTransaction(projectValeContext(input).canonicalTransactionInput, dependencies);
}
