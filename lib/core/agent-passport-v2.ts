import type { EntityGovernanceStatus } from "./entity-identity.ts";
import type { TrustLifecyclePhase } from "./trust-lifecycle.ts";

export type AgentPassportCredentialFormat =
  | "internal_json"
  | "future_vc_adapter"
  | "future_jwt_jws_adapter";

export type AgentPassportV2 = {
  passportVersion: "2.0";
  schemaVersion: "standards-foundation-0.8";
  agentId: string;
  agentName: string;
  ownerOrganization: string;
  humanAuthority: string;
  credentialFormat: AgentPassportCredentialFormat;
  credentialIssuer: string;
  jurisdiction: string;
  governanceStatus: EntityGovernanceStatus;
  humanOversightStatus: "assigned" | "required" | "not_recorded";
  delegationLimits: {
    allowedPurposes: string[];
    allowedWorkflows: string[];
    maxAutonomy: "none" | "assistive" | "supervised_execution";
    requiresApprovalFor: string[];
  };
  revocationStatus: "active" | "suspended" | "revoked" | "unknown";
  exportFormats: Array<{
    format: AgentPassportCredentialFormat;
    status: "implemented" | "planned";
    notes: string;
  }>;
  evidenceRefs: string[];
  replayRefs: string[];
  currentTrustScore: number | null;
  historicalTrend: Array<{
    at: string;
    score: number;
    reason: string;
  }>;
  lifecycleStage: TrustLifecyclePhase;
  evidenceCompleteness: number;
  replayAvailability: "available" | "partial" | "unavailable";
  trustMemorySummary: string;
  boundary: string;
};

export function createAgentPassportV2(input: Partial<AgentPassportV2> & {
  agentId: string;
  agentName: string;
  ownerOrganization?: string;
  humanAuthority?: string;
}): AgentPassportV2 {
  return {
    passportVersion: "2.0",
    schemaVersion: "standards-foundation-0.8",
    agentId: input.agentId,
    agentName: input.agentName,
    ownerOrganization: input.ownerOrganization ?? "Owner organization not recorded",
    humanAuthority: input.humanAuthority ?? "Human authority not recorded",
    credentialFormat: input.credentialFormat ?? "internal_json",
    credentialIssuer: input.credentialIssuer ?? "Cyber Sentinels standards-ready adapter",
    jurisdiction: input.jurisdiction ?? "not_recorded",
    governanceStatus: input.governanceStatus ?? "review_required",
    humanOversightStatus: input.humanOversightStatus ?? "required",
    delegationLimits: input.delegationLimits ?? {
      allowedPurposes: ["workflow_assistance"],
      allowedWorkflows: ["standards-readiness-demo"],
      maxAutonomy: "assistive",
      requiresApprovalFor: ["external_execution", "restricted_data", "scope_expansion"],
    },
    revocationStatus: input.revocationStatus ?? "unknown",
    exportFormats: input.exportFormats ?? [
      {
        format: "internal_json",
        status: "implemented",
        notes: "Portable JSON export for current enterprise review and replay.",
      },
      {
        format: "future_vc_adapter",
        status: "planned",
        notes: "Adapter slot for future verifiable credential alignment without hard dependency.",
      },
      {
        format: "future_jwt_jws_adapter",
        status: "planned",
        notes: "Adapter slot for future signed token alignment without hard dependency.",
      },
    ],
    evidenceRefs: input.evidenceRefs ?? [],
    replayRefs: input.replayRefs ?? [],
    currentTrustScore: input.currentTrustScore ?? null,
    historicalTrend: input.historicalTrend ?? [],
    lifecycleStage: input.lifecycleStage ?? "application",
    evidenceCompleteness: Math.max(0, Math.min(100, input.evidenceCompleteness ?? 0)),
    replayAvailability: input.replayAvailability ?? ((input.replayRefs?.length ?? 0) > 0 ? "available" : "unavailable"),
    trustMemorySummary: input.trustMemorySummary ?? "No lifecycle Trust Memory has been recorded.",
    boundary:
      "Agent Passport v2 is standards-ready JSON today with future VC and JWT/JWS adapters. It does not hard-code draft standards or create vendor lock-in.",
  };
}

export function exportAgentPassportJson(passport: AgentPassportV2) {
  return {
    schema: passport.schemaVersion,
    passportVersion: passport.passportVersion,
    credentialFormat: passport.credentialFormat,
    subject: {
      agentId: passport.agentId,
      agentName: passport.agentName,
      ownerOrganization: passport.ownerOrganization,
      humanAuthority: passport.humanAuthority,
    },
    governance: {
      jurisdiction: passport.jurisdiction,
      governanceStatus: passport.governanceStatus,
      humanOversightStatus: passport.humanOversightStatus,
      delegationLimits: passport.delegationLimits,
      revocationStatus: passport.revocationStatus,
    },
    exportFormats: passport.exportFormats,
    evidenceRefs: passport.evidenceRefs,
    replayRefs: passport.replayRefs,
    continuousTrust: {
      currentTrustScore: passport.currentTrustScore,
      historicalTrend: passport.historicalTrend,
      lifecycleStage: passport.lifecycleStage,
      evidenceCompleteness: passport.evidenceCompleteness,
      replayAvailability: passport.replayAvailability,
      governanceStatus: passport.governanceStatus,
      trustMemorySummary: passport.trustMemorySummary,
    },
    boundary: passport.boundary,
  };
}

export const demoAgentPassportV2 = createAgentPassportV2({
  agentId: "agent-contract-review",
  agentName: "Contract Review Agent",
  ownerOrganization: "Example Enterprise",
  humanAuthority: "ciso@example.com",
  jurisdiction: "EU operational pilot",
  governanceStatus: "in_review",
  humanOversightStatus: "assigned",
  revocationStatus: "active",
  evidenceRefs: ["evidence-provider-hopae", "authorization-demo-001"],
  replayRefs: ["replay-demo-001"],
  currentTrustScore: 78,
  historicalTrend: [
    { at: "2026-07-12T08:00:00.000Z", score: 72, reason: "Identity and owner authority confirmed." },
    { at: "2026-07-12T08:10:00.000Z", score: 78, reason: "Runtime evidence completed governance review." },
  ],
  lifecycleStage: "runtime_trust",
  evidenceCompleteness: 86,
  replayAvailability: "available",
  trustMemorySummary: "Identity, authority, runtime evidence and governance decisions remain connected in replay.",
});
