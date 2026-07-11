export type MachineCredentialKind =
  | "service_account"
  | "api_key"
  | "oauth_client"
  | "certificate";

export type MachineIdentityTrustInput = {
  id: string;
  owner: string;
  credentialKind: MachineCredentialKind;
  credentialId: string;
  linkedAiAgent?: string | null;
  linkedWorkflow?: string | null;
  rotationHistory?: Array<{ rotatedAt: string; reason: string }>;
  lastRotatedAt?: string | null;
  expiresAt?: string | null;
  revoked?: boolean;
};

export type MachineIdentityTrust = {
  id: string;
  owner: string;
  credentialLineage: {
    credentialKind: MachineCredentialKind;
    credentialId: string;
    linkedAiAgent: string | null;
    linkedWorkflow: string | null;
  };
  keyRotation: {
    status: "current" | "rotation_due" | "expired" | "revoked" | "not_recorded";
    lastRotatedAt: string | null;
    expiresAt: string | null;
    rotationHistory: Array<{ rotatedAt: string; reason: string }>;
  };
  riskPosture: "low" | "medium" | "high" | "critical";
  evidenceRefs: string[];
  boundary: string;
};

function daysUntil(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.ceil((parsed - Date.now()) / 86400000);
}

export function buildMachineIdentityTrust(input: MachineIdentityTrustInput): MachineIdentityTrust {
  const expiresInDays = daysUntil(input.expiresAt);
  const status = input.revoked
    ? "revoked"
    : expiresInDays === null
      ? "not_recorded"
      : expiresInDays < 0
        ? "expired"
        : expiresInDays <= 30
          ? "rotation_due"
          : "current";
  const riskPosture =
    status === "revoked" || status === "expired"
      ? "critical"
      : status === "rotation_due"
        ? "high"
        : status === "not_recorded"
          ? "medium"
          : "low";

  return {
    id: input.id,
    owner: input.owner,
    credentialLineage: {
      credentialKind: input.credentialKind,
      credentialId: input.credentialId,
      linkedAiAgent: input.linkedAiAgent ?? null,
      linkedWorkflow: input.linkedWorkflow ?? null,
    },
    keyRotation: {
      status,
      lastRotatedAt: input.lastRotatedAt ?? null,
      expiresAt: input.expiresAt ?? null,
      rotationHistory: input.rotationHistory ?? [],
    },
    riskPosture,
    evidenceRefs: [
      `machine_identity:${input.id}`,
      `credential:${input.credentialKind}:${input.credentialId}`,
      input.linkedAiAgent ? `ai_agent:${input.linkedAiAgent}` : null,
      input.linkedWorkflow ? `workflow:${input.linkedWorkflow}` : null,
    ].filter((item): item is string => Boolean(item)),
    boundary:
      "Machine identity trust records credential lineage and rotation posture. It does not expose API keys, secrets or certificate material.",
  };
}

export const demoMachineIdentityTrust = buildMachineIdentityTrust({
  id: "machine-ats-webhook-prod",
  owner: "Example Enterprise IAM",
  credentialKind: "oauth_client",
  credentialId: "oauth-client-ats-prod",
  linkedAiAgent: "agent-contract-review",
  linkedWorkflow: "workflow-vendor-access",
  lastRotatedAt: "2026-07-01T00:00:00.000Z",
  expiresAt: "2026-12-31T00:00:00.000Z",
  rotationHistory: [
    { rotatedAt: "2026-07-01T00:00:00.000Z", reason: "Pilot credential initialization." },
  ],
});
