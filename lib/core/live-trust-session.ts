import type { AuthorizationGatewayResult } from "./authorization-gateway.ts";

export type LiveTrustSnapshot = {
  id: string;
  workflowId: string;
  capturedAt: string;
  providerEvidence: string[];
  deviceIntegrity: "trusted" | "changed" | "unknown";
  streamIntegrity: "continuous" | "interrupted" | "unknown";
  identityContinuity: "continuous" | "changed" | "unknown";
  policyResponse: AuthorizationGatewayResult["decision"];
  challengeEvents: string[];
  trustEvolution: string;
  replayReference: string;
};

export type LiveTrustSession = {
  sessionId: string;
  workflowId: string;
  snapshots: LiveTrustSnapshot[];
  replayEveryStateChange: true;
  boundary: string;
};

export function createLiveTrustSnapshot(input: Omit<LiveTrustSnapshot, "id" | "capturedAt" | "replayReference"> & {
  id?: string;
  capturedAt?: string;
  replayReference?: string;
}): LiveTrustSnapshot {
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  return {
    ...input,
    id: input.id ?? `snapshot_${input.workflowId}_${capturedAt}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
    capturedAt,
    replayReference: input.replayReference ?? `replay:${input.workflowId}:${capturedAt}`,
  };
}

export function buildLiveTrustSession(input: {
  sessionId: string;
  workflowId: string;
  snapshots: LiveTrustSnapshot[];
}): LiveTrustSession {
  return {
    sessionId: input.sessionId,
    workflowId: input.workflowId,
    snapshots: [...input.snapshots].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt)),
    replayEveryStateChange: true,
    boundary:
      "Live Trust Sessions retain continuous trust snapshots for replay. They are operational state records, not hidden surveillance or automatic enforcement.",
  };
}

export const demoLiveTrustSession = buildLiveTrustSession({
  sessionId: "live-session-demo-001",
  workflowId: "workflow-vendor-access",
  snapshots: [
    createLiveTrustSnapshot({
      id: "snapshot-identity",
      workflowId: "workflow-vendor-access",
      capturedAt: "2026-07-11T09:00:00.000Z",
      providerEvidence: ["evidence-provider-hopae"],
      deviceIntegrity: "trusted",
      streamIntegrity: "continuous",
      identityContinuity: "continuous",
      policyResponse: "ALLOW",
      challengeEvents: [],
      trustEvolution: "Initial identity and provider evidence supported workflow entry.",
      replayReference: "replay-demo-001",
    }),
    createLiveTrustSnapshot({
      id: "snapshot-approval",
      workflowId: "workflow-vendor-access",
      capturedAt: "2026-07-11T09:03:00.000Z",
      providerEvidence: ["evidence-provider-hopae", "authorization-demo-001"],
      deviceIntegrity: "trusted",
      streamIntegrity: "continuous",
      identityContinuity: "continuous",
      policyResponse: "APPROVAL REQUIRED",
      challengeEvents: ["governance-review-opened"],
      trustEvolution: "Delegated AI-agent action required governance approval before execution.",
      replayReference: "replay-demo-001",
    }),
  ],
});
