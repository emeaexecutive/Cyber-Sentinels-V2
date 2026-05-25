import {
  demoTrustFabric,
  evaluateTrustFabric,
  type TrustFabricInput,
  type TrustFabricSnapshot,
} from "@/lib/trust-engine/trustFabric";

export const realityOSStates = [
  "stable",
  "monitoring",
  "adaptive",
  "high_alert",
  "containment",
] as const;

export type RealityOSState = (typeof realityOSStates)[number];

export type RealityOSInput = TrustFabricInput & {
  permission_pressure?: number | null;
  evidence_strength?: number | null;
  human_presence_strength?: number | null;
};

export type RealityOSSnapshot = {
  state: RealityOSState;
  trust_fabric_health: TrustFabricSnapshot["health"];
  active_nodes: number;
  connected_systems: TrustFabricSnapshot["connected_systems"];
  trust_signals: number;
  permissions_layer: "ready" | "step_up_watch" | "restricted";
  human_presence: "stable" | "watch" | "weak";
  synthetic_activity: "low" | "watch" | "elevated" | "high";
  network_relationships: number;
  global_trust_activity: number;
  fabric: TrustFabricSnapshot;
};

function syntheticBand(value: number): "low" | "watch" | "elevated" | "high" {
  if (value >= 75) return "high";
  if (value >= 50) return "elevated";
  if (value >= 25) return "watch";

  return "low";
}

function realityState(
  fabric: TrustFabricSnapshot,
  permissionPressure: number,
  evidenceStrength: number,
  humanPresenceStrength: number
): RealityOSState {
  if (permissionPressure >= 90 || evidenceStrength < 35) return "containment";
  if (fabric.synthetic_activity >= 75 || humanPresenceStrength < 45) {
    return "high_alert";
  }
  if (fabric.health === "strong" && fabric.signals >= 500) return "adaptive";
  if (fabric.signals >= 120 || permissionPressure >= 35) return "monitoring";

  return "stable";
}

export function evaluateRealityOS(
  input: RealityOSInput = {}
): RealityOSSnapshot {
  const fabric = evaluateTrustFabric(input);
  const permissionPressure =
    typeof input.permission_pressure === "number" ? input.permission_pressure : 30;
  const evidenceStrength =
    typeof input.evidence_strength === "number" ? input.evidence_strength : 82;
  const humanPresenceStrength =
    typeof input.human_presence_strength === "number"
      ? input.human_presence_strength
      : 84;

  return {
    state: realityState(
      fabric,
      permissionPressure,
      evidenceStrength,
      humanPresenceStrength
    ),
    trust_fabric_health: fabric.health,
    active_nodes: fabric.active_nodes,
    connected_systems: fabric.connected_systems,
    trust_signals: fabric.signals,
    permissions_layer:
      permissionPressure >= 75
        ? "restricted"
        : permissionPressure >= 35
          ? "step_up_watch"
          : "ready",
    human_presence:
      humanPresenceStrength >= 75
        ? "stable"
        : humanPresenceStrength >= 55
          ? "watch"
          : "weak",
    synthetic_activity: syntheticBand(fabric.synthetic_activity),
    network_relationships: fabric.relationships,
    global_trust_activity: fabric.global_activity,
    fabric,
  };
}

export const demoRealityOS = evaluateRealityOS(demoTrustFabric);
