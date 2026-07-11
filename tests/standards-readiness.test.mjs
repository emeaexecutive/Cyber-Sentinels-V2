import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createAgentPassportV2,
  exportAgentPassportJson,
} from "../lib/core/agent-passport-v2.ts";
import { evaluateAuthorizationGateway } from "../lib/core/authorization-gateway.ts";
import { buildLiveTrustSession, createLiveTrustSnapshot } from "../lib/core/live-trust-session.ts";
import { buildMachineIdentityTrust } from "../lib/core/machine-identity-trust.ts";
import { evaluateTrustEnforcement } from "../lib/core/trust-enforcement.ts";

test("Agent Passport v2 exports standards-ready JSON without hard dependency adapters", () => {
  const passport = createAgentPassportV2({
    agentId: "agent-1",
    agentName: "Review Agent",
    ownerOrganization: "Example Enterprise",
    humanAuthority: "owner@example.com",
  });
  const exported = exportAgentPassportJson(passport);

  assert.equal(passport.passportVersion, "2.0");
  assert.equal(exported.credentialFormat, "internal_json");
  assert.ok(passport.exportFormats.some((item) => item.format === "future_vc_adapter" && item.status === "planned"));
  assert.ok(passport.exportFormats.some((item) => item.format === "future_jwt_jws_adapter" && item.status === "planned"));
  assert.match(passport.boundary, /does not hard-code draft standards/i);
});

test("authorization stays external to agent runtime and separates authentication from authorization", () => {
  const insideRuntime = evaluateAuthorizationGateway({
    subjectId: "agent-1",
    subjectType: "ai_agent",
    authenticated: true,
    requestedAction: "run_payment",
    requestedPurpose: "workflow_assistance",
    allowedActions: ["run_payment"],
    allowedPurposes: ["workflow_assistance"],
    runtimeLocation: "agent_runtime",
  });
  const approvalRequired = evaluateAuthorizationGateway({
    subjectId: "agent-1",
    subjectType: "ai_agent",
    authenticated: true,
    requestedAction: "review_vendor_access",
    requestedPurpose: "workflow_assistance",
    allowedActions: ["review_vendor_access"],
    allowedPurposes: ["workflow_assistance"],
    governanceStatus: "in_review",
    humanApprovalPresent: false,
    runtimeLocation: "external_gateway",
  });

  assert.equal(insideRuntime.decision, "DENY");
  assert.equal(insideRuntime.externalToAgentRuntime, false);
  assert.equal(approvalRequired.decision, "APPROVAL REQUIRED");
});

test("trust enforcement defaults to deny on failed nonce or purpose checks and emits a receipt", () => {
  const authorization = evaluateAuthorizationGateway({
    subjectId: "agent-1",
    subjectType: "ai_agent",
    authenticated: true,
    requestedAction: "review_vendor_access",
    requestedPurpose: "workflow_assistance",
    allowedActions: ["review_vendor_access"],
    allowedPurposes: ["workflow_assistance"],
    runtimeLocation: "external_gateway",
  });
  const enforcement = evaluateTrustEnforcement({
    workflowId: "workflow-1",
    purpose: "restricted_export",
    allowedPurposes: ["workflow_assistance"],
    arguments: { workflowId: "workflow-1" },
    requiredArguments: ["workflowId", "action"],
    delegationValid: true,
    nonce: "nonce-1",
    seenNonces: ["nonce-1"],
    timestamp: new Date().toISOString(),
    authorization,
    policyVersion: "standards-foundation-0.8",
  });

  assert.equal(enforcement.decision, "DENY");
  assert.equal(enforcement.defaultDeny, true);
  assert.equal(enforcement.executionReceipt.replayRequired, true);
  assert.ok(enforcement.checks.some((check) => check.name === "nonce validation" && check.passed === false));
});

test("machine identity trust records credential lineage and rotation posture without secrets", () => {
  const machine = buildMachineIdentityTrust({
    id: "machine-1",
    owner: "IAM",
    credentialKind: "oauth_client",
    credentialId: "oauth-client-1",
    linkedAiAgent: "agent-1",
    linkedWorkflow: "workflow-1",
    expiresAt: "2026-07-01T00:00:00.000Z",
  });

  assert.equal(machine.credentialLineage.linkedAiAgent, "agent-1");
  assert.equal(machine.credentialLineage.linkedWorkflow, "workflow-1");
  assert.equal(machine.keyRotation.status, "expired");
  assert.equal(machine.riskPosture, "critical");
  assert.match(machine.boundary, /does not expose API keys/i);
});

test("live trust sessions replay every state change", () => {
  const session = buildLiveTrustSession({
    sessionId: "session-1",
    workflowId: "workflow-1",
    snapshots: [
      createLiveTrustSnapshot({
        workflowId: "workflow-1",
        providerEvidence: ["provider-evidence"],
        deviceIntegrity: "trusted",
        streamIntegrity: "continuous",
        identityContinuity: "continuous",
        policyResponse: "ALLOW",
        challengeEvents: [],
        trustEvolution: "Initial state trusted.",
      }),
    ],
  });

  assert.equal(session.replayEveryStateChange, true);
  assert.equal(session.snapshots[0].policyResponse, "ALLOW");
  assert.match(session.snapshots[0].replayReference, /replay/);
});

test("provider sovereignty and graph standards fields are present in source", async () => {
  const providerReadiness = await readFile(new URL("../lib/providers/provider-readiness.ts", import.meta.url), "utf8");
  const graph = await readFile(new URL("../lib/evidence-graph/evidence-graph.ts", import.meta.url), "utf8");
  const trustMemory = await readFile(new URL("../lib/trust-memory/trust-memory.ts", import.meta.url), "utf8");

  assert.match(providerReadiness, /deploymentMode/);
  assert.match(providerReadiness, /restrictedDataSupport/);
  assert.match(providerReadiness, /customerOwnedMemoryCompatible/);
  assert.match(providerReadiness, /providerShutdownRisk/);
  assert.match(providerReadiness, /exportSupport/);
  assert.match(graph, /"organization"/);
  assert.match(graph, /"authorization"/);
  assert.match(graph, /"execution"/);
  assert.match(trustMemory, /Enterprise Operational Memory/);
});
