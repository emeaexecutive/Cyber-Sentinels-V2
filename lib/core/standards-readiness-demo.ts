import { demoAgentPassportV2, exportAgentPassportJson } from "./agent-passport-v2.ts";
import { evaluateAuthorizationGateway } from "./authorization-gateway.ts";
import { buildDecisionIntelligence } from "./decision-intelligence.ts";
import { buildEvidenceGraphDemo } from "../evidence-graph/evidence-graph.ts";
import { buildDemoTrustExplanation } from "../trust-explanation/explanation.ts";
import { demoLiveTrustSession } from "./live-trust-session.ts";
import { demoMachineIdentityTrust } from "./machine-identity-trust.ts";
import { evaluateTrustEnforcement } from "./trust-enforcement.ts";

export function buildStandardsReadinessDemo() {
  const passport = demoAgentPassportV2;
  const authorization = evaluateAuthorizationGateway({
    subjectId: passport.agentId,
    subjectType: "ai_agent",
    authenticated: true,
    requestedAction: "review_vendor_access",
    requestedPurpose: "workflow_assistance",
    allowedActions: ["review_vendor_access"],
    allowedPurposes: passport.delegationLimits.allowedPurposes,
    governanceStatus: passport.governanceStatus,
    humanApprovalPresent: false,
    stepUpSatisfied: true,
    runtimeLocation: "external_gateway",
  });
  const enforcement = evaluateTrustEnforcement({
    workflowId: "workflow-vendor-access",
    purpose: "workflow_assistance",
    allowedPurposes: passport.delegationLimits.allowedPurposes,
    arguments: { workflowId: "workflow-vendor-access", action: "review_vendor_access" },
    requiredArguments: ["workflowId", "action"],
    delegationValid: true,
    nonce: "nonce-demo-001",
    seenNonces: [],
    timestamp: new Date().toISOString(),
    authorization,
    policyVersion: "standards-foundation-0.8",
  });
  const graph = buildEvidenceGraphDemo();
  const explanation = buildDemoTrustExplanation(graph);
  const decision = buildDecisionIntelligence({ explanation });

  return {
    release: "0.8 Standards Foundation",
    story: [
      "Verified Human",
      "Delegated AI Agent",
      "Authorization Gateway",
      "Trust Enforcement",
      "Workflow",
      "Replay",
      "Governance",
      "Trust Memory",
      "Enterprise Decision",
    ],
    agentPassport: passport,
    jsonExport: exportAgentPassportJson(passport),
    authorization,
    enforcement,
    machineIdentity: demoMachineIdentityTrust,
    liveTrustSession: demoLiveTrustSession,
    evidenceGraph: graph,
    decision,
    boundary:
      "Standards readiness is implemented through adapters, versioning and export contracts. No draft standard is hard-coded as a dependency.",
  };
}
