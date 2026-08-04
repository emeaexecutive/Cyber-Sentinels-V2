import assert from "node:assert/strict";
import test from "node:test";

import { createDesignPartnerDecisionEngine } from "../lib/design-partner/trust-transaction.ts";

test("rejects agents without accountable owner or operator binding", () => {
  const engine = createDesignPartnerDecisionEngine();

  assert.throws(() => {
    engine.registerAgent({
      tenantId: "tenant-a",
      enterpriseId: "enterprise-a",
      agentId: "agent-bad",
      accountableOwnerId: "",
      operatorId: "",
      agentName: "Bad Agent",
      agentType: "assistant",
      provider: "hopae_connect",
      modelFamily: "gpt",
      modelVersion: "4.1",
      runtime: "staging",
      purpose: "security workflow review",
      permittedTools: ["github_pull_request_create"],
      permittedDataClasses: ["internal"],
      permittedResources: ["repo:demo"],
      environment: "staging",
      status: "active",
      registeredAt: "2026-08-01T00:00:00.000Z",
      evidenceReferences: [],
      canonicalDigest: "digest-agent",
    });
  }, /accountable owner/i);
});

test("rejects requests when the authenticated actor is not the accountable owner or operator", () => {
  const engine = createDesignPartnerDecisionEngine();
  const agent = engine.registerAgent({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    agentId: "agent-operator-check",
    accountableOwnerId: "owner-1",
    operatorId: "operator-1",
    agentName: "Operator Check Agent",
    agentType: "assistant",
    provider: "hopae_connect",
    modelFamily: "gpt",
    modelVersion: "4.1",
    runtime: "staging",
    purpose: "security workflow review",
    permittedTools: ["github_pull_request_create"],
    permittedDataClasses: ["internal"],
    permittedResources: ["repo:demo"],
    environment: "staging",
    status: "active",
    registeredAt: "2026-08-01T00:00:00.000Z",
    evidenceReferences: ["evidence-1"],
    canonicalDigest: "digest-agent",
  });

  const authority = engine.delegateAuthority({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    principalHumanId: "owner-1",
    delegatedAgentId: agent.agentId,
    purpose: "create pull requests",
    permittedActionTypes: ["github_pull_request_create"],
    permittedTools: ["github_pull_request_create"],
    permittedResources: ["repo:demo"],
    permittedRepositories: ["demo/repo"],
    permittedBranches: ["feature/*"],
    permittedEnvironments: ["staging"],
    dataBoundary: "internal",
    maximumActionCount: 5,
    maximumDelegationDepth: 0,
    issuedAt: "2026-08-01T00:00:00.000Z",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-08-02T00:00:00.000Z",
    policyId: "policy-1",
    policyVersion: "v1",
    canonicalDigest: "digest-authority",
  });

  const result = engine.evaluateTrustDecision({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    actorContext: { authenticatedActorId: "unauthorized-human", actorType: "human" },
    agent,
    authority,
    action: {
      requestId: "req-actor-check",
      actionType: "github_pull_request_create",
      targetSystem: "github",
      repository: "demo/repo",
      branch: "feature/demo",
      resource: "repo:demo",
      requestedOperation: "create",
      changeClassification: "minor",
      environment: "staging",
      purpose: "create a pull request",
      toolReference: "github_pull_request_create",
      agentVersion: "4.1",
      modelVersion: "4.1",
      requestedAt: "2026-08-01T01:00:00.000Z",
      idempotencyKey: "idem-actor-check",
      correlationId: "corr-actor-check",
      evidenceReferences: ["evidence-1"],
      canonicalDigest: "digest-request",
    },
    policy: { id: "policy-1", version: "v1", digest: "policy-digest" },
    trustState: { state: "verified", updatedAt: "2026-08-01T00:30:00.000Z" },
    providerEvidence: [
      {
        providerId: "hopae_connect",
        providerEnvironment: "staging",
        providerOperation: "assessment",
        externalReference: "ext-1",
        assuranceLevel: "medium",
        normalizedResult: "pass",
        providerNativeStatus: "available",
        providerTimestamp: "2026-08-01T00:50:00.000Z",
        receivedAt: "2026-08-01T00:51:00.000Z",
        freshness: 0.95,
        confidence: 0.9,
        evidenceDigest: "provider-digest",
        limitations: [],
        timeout: false,
        correlationId: "corr-provider",
      },
    ],
    activeIncidents: [],
    environment: "staging",
    correlationId: "corr-actor-check",
  });

  assert.equal(result.decision, "review");
  assert.ok(result.reasonCodes.includes("AUTHENTICATED_ACTOR_UNAUTHORIZED"));
  assert.equal(result.relayState, "not_relayed");
});

test("rejects malformed action requests instead of fabricating a decision", () => {
  const engine = createDesignPartnerDecisionEngine();
  const agent = engine.registerAgent({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    agentId: "agent-alpha",
    accountableOwnerId: "owner-1",
    operatorId: "operator-1",
    agentName: "Agent Alpha",
    agentType: "assistant",
    provider: "hopae_connect",
    modelFamily: "gpt",
    modelVersion: "4.1",
    runtime: "staging",
    purpose: "security workflow review",
    permittedTools: ["github_pull_request_create"],
    permittedDataClasses: ["internal"],
    permittedResources: ["repo:demo"],
    environment: "staging",
    status: "active",
    registeredAt: "2026-08-01T00:00:00.000Z",
    evidenceReferences: ["evidence-1"],
    canonicalDigest: "digest-agent",
  });

  const authority = engine.delegateAuthority({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    principalHumanId: "owner-1",
    delegatedAgentId: agent.agentId,
    purpose: "create pull requests",
    permittedActionTypes: ["github_pull_request_create"],
    permittedTools: ["github_pull_request_create"],
    permittedResources: ["repo:demo"],
    permittedRepositories: ["demo/repo"],
    permittedBranches: ["feature/*"],
    permittedEnvironments: ["staging"],
    dataBoundary: "internal",
    maximumActionCount: 5,
    maximumDelegationDepth: 0,
    issuedAt: "2026-08-01T00:00:00.000Z",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-08-02T00:00:00.000Z",
    policyId: "policy-1",
    policyVersion: "v1",
    canonicalDigest: "digest-authority",
  });

  const result = engine.evaluateTrustDecision({
    tenantId: "tenant-a",
    enterpriseId: "enterprise-a",
    actorContext: { authenticatedActorId: "owner-1", actorType: "human" },
    agent,
    authority,
    action: {
      requestId: "",
      actionType: "github_pull_request_create",
      targetSystem: "github",
      repository: "demo/repo",
      branch: "feature/demo",
      resource: "repo:demo",
      requestedOperation: "create",
      changeClassification: "minor",
      environment: "staging",
      purpose: "create a pull request",
      toolReference: "github_pull_request_create",
      agentVersion: "4.1",
      modelVersion: "4.1",
      requestedAt: "2026-08-01T01:00:00.000Z",
      idempotencyKey: "",
      correlationId: "corr-malformed",
      evidenceReferences: ["evidence-1"],
      canonicalDigest: "",
    },
    policy: { id: "policy-1", version: "v1", digest: "policy-digest" },
    trustState: { state: "verified", updatedAt: "2026-08-01T00:30:00.000Z" },
    providerEvidence: [
      {
        providerId: "hopae_connect",
        providerEnvironment: "staging",
        providerOperation: "assessment",
        externalReference: "ext-1",
        assuranceLevel: "medium",
        normalizedResult: "pass",
        providerNativeStatus: "available",
        providerTimestamp: "2026-08-01T00:50:00.000Z",
        receivedAt: "2026-08-01T00:51:00.000Z",
        freshness: 0.95,
        confidence: 0.9,
        evidenceDigest: "provider-digest",
        limitations: [],
        timeout: false,
        correlationId: "corr-provider",
      },
    ],
    activeIncidents: [],
    environment: "staging",
    correlationId: "corr-malformed",
  });

  assert.equal(result.decision, "deny");
  assert.ok(result.reasonCodes.includes("ACTION_REQUEST_INVALID"));
  assert.equal(result.relayState, "relay_denied");
});
