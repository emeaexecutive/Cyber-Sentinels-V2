export const trustFabricNodeTypes = [
  "human",
  "agent",
  "media",
  "company",
  "passport",
  "signal",
  "decision",
  "evidence",
  "relationship",
  "permission",
  "review",
  "marketplace",
  "api",
] as const;

export const connectedTrustSystems = [
  ["Trust Passport", "/passport"],
  ["Reality Passport", "/reality-passport"],
  ["Human Presence Index", "/human-presence-index"],
  ["Human Presence Genome", "/human-presence-genome"],
  ["Origin DNA", "/origin-dna"],
  ["Reality Chain", "/reality-chain"],
  ["Trust Timeline", "/trust-timeline"],
  ["Trust Graph", "/trust-graph"],
  ["Prediction Engine", "/trust-prediction"],
  ["Permissions Firewall", "/permissions-firewall"],
  ["Step-Up Verification", "/step-up-verification"],
  ["Evidence Vault", "/evidence-vault"],
  ["Decision Engine", "/decision-engine"],
  ["Policy Engine", "/policy-engine"],
  ["Revocation Engine", "/revocation-engine"],
  ["Recovery Engine", "/trust-recovery"],
  ["Agent Registry", "/agent-registry"],
  ["Mission Control", "/mission-control"],
] as const;

export const trustFabricSignals = [
  "reality_os_updated",
  "trust_fabric_changed",
  "global_trust_shift_detected",
] as const;

export const trustFabricAuditEvents = [
  "reality_os_evaluated",
  "trust_fabric_updated",
] as const;

export type TrustFabricNodeType = (typeof trustFabricNodeTypes)[number];
export type TrustFabricHealth = "weak" | "watch" | "strong";

export type TrustFabricInput = {
  active_nodes?: number | null;
  humans?: number | null;
  agents?: number | null;
  signals?: number | null;
  decisions?: number | null;
  evidence?: number | null;
  permissions?: number | null;
  relationships?: number | null;
  synthetic_activity?: number | null;
  global_activity?: number | null;
};

export type TrustFabricSnapshot = {
  active_nodes: number;
  humans: number;
  agents: number;
  signals: number;
  decisions: number;
  evidence: number;
  permissions: number;
  relationships: number;
  synthetic_activity: number;
  global_activity: number;
  health: TrustFabricHealth;
  node_types: readonly TrustFabricNodeType[];
  connected_systems: typeof connectedTrustSystems;
};

function value(input: number | null | undefined, fallback: number) {
  return typeof input === "number" && Number.isFinite(input)
    ? Math.max(0, Math.round(input))
    : fallback;
}

function healthFromActivity(snapshot: Omit<TrustFabricSnapshot, "health">) {
  if (snapshot.active_nodes >= 100 && snapshot.signals >= 500) return "strong";
  if (snapshot.active_nodes >= 40 || snapshot.signals >= 120) return "watch";

  return "weak";
}

export function evaluateTrustFabric(
  input: TrustFabricInput = {}
): TrustFabricSnapshot {
  const snapshot = {
    active_nodes: value(input.active_nodes, 143),
    humans: value(input.humans, 31),
    agents: value(input.agents, 17),
    signals: value(input.signals, 920),
    decisions: value(input.decisions, 42),
    evidence: value(input.evidence, 66),
    permissions: value(input.permissions, 28),
    relationships: value(input.relationships, 214),
    synthetic_activity: value(input.synthetic_activity, 18),
    global_activity: value(input.global_activity, 77),
    node_types: trustFabricNodeTypes,
    connected_systems: connectedTrustSystems,
  };

  return {
    ...snapshot,
    health: healthFromActivity(snapshot),
  };
}

export const demoTrustFabric = evaluateTrustFabric();
