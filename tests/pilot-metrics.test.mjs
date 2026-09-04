import test from "node:test";
import assert from "node:assert/strict";

import { buildPilotMetricContract, buildPilotMetricsSnapshot } from "../src/lib/pilot/metrics-service.ts";

test("calculates core pilot metrics without dividing by zero", () => {
  const snapshot = buildPilotMetricsSnapshot({
    window: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T23:59:59.999Z" },
    enterpriseId: "ent-1",
    decisions: [],
    alerts: [],
    reviews: [],
    evidence: [],
    revocations: [],
    providerEvidence: [],
    credentialNegativeTests: [],
  });

  assert.equal(snapshot.actionsGoverned, 0);
  assert.equal(snapshot.unauthorizedAllow, 0);
  assert.equal(snapshot.outOfScopeRejectionRate, 0);
  assert.equal(snapshot.authorityIntegrityRate, 0);
  assert.equal(snapshot.evidenceCoverage, 0);
  assert.equal(snapshot.replayCoverage, 0);
  assert.equal(snapshot.recoveryCoverage, 0);
});

test("returns an explicit measurement contract for live and demo metrics", () => {
  const contract = buildPilotMetricContract({
    window: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T23:59:59.999Z" },
    enterpriseId: "ent-1",
    decisions: [
      {
        id: "d1",
        enterpriseId: "ent-1",
        tenantId: "tenant-a",
        decision: "ALLOW",
        createdAt: "2026-09-10T10:00:00.000Z",
        governed: true,
        outOfScope: false,
        unauthorized: false,
        authorityIntegrity: true,
        evidenceComplete: true,
        replayAvailable: true,
        recoveryAvailable: true,
        providerEvidenceState: "present",
        authority: {
          actor: "agent-1",
          credential: "cred-1",
          delegator: "ops-1",
          resource: "repo-a",
          action: "deploy",
          validity: true,
          revocationState: "active",
          decision: "ALLOW",
        },
      },
    ],
    reviews: [],
    revocations: [],
    credentialNegativeTests: [],
  });

  assert.equal(contract[0].metric, "unauthorized_allow");
  assert.equal(contract[0].measurementState, "MEASURED");
  assert.equal(contract[0].tenant, "ent-1");
  assert.equal(contract[0].sampleSize, 1);

  const emptyContract = buildPilotMetricContract({
    window: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T23:59:59.999Z" },
    enterpriseId: "ent-1",
    decisions: [],
    reviews: [],
    revocations: [],
    credentialNegativeTests: [],
  });
  assert.equal(emptyContract.find((item) => item.metric === "governed_action_coverage")?.measurementState, "NOT_MEASURABLE");
});

test("computes pilot metrics for a controlled workflow and reviews", () => {
  const snapshot = buildPilotMetricsSnapshot({
    window: { start: "2026-09-01T00:00:00.000Z", end: "2026-09-30T23:59:59.999Z" },
    enterpriseId: "ent-1",
    decisions: [
      {
        id: "d1",
        enterpriseId: "ent-1",
        tenantId: "tenant-a",
        decision: "ALLOW",
        createdAt: "2026-09-10T10:00:00.000Z",
        governed: true,
        outOfScope: false,
        unauthorized: false,
        authorityIntegrity: true,
        evidenceComplete: true,
        replayAvailable: true,
        recoveryAvailable: true,
        providerEvidenceState: "present",
        latencyMs: 300000,
        authority: {
          actor: "agent-1",
          credential: "cred-1",
          delegator: "ops-1",
          resource: "repo-a",
          action: "deploy",
          validity: true,
          revocationState: "active",
          decision: "ALLOW",
        },
      },
      {
        id: "d2",
        enterpriseId: "ent-1",
        tenantId: "tenant-a",
        decision: "REVIEW",
        createdAt: "2026-09-10T11:00:00.000Z",
        governed: true,
        outOfScope: true,
        unauthorized: true,
        authorityIntegrity: false,
        evidenceComplete: false,
        replayAvailable: false,
        recoveryAvailable: false,
        providerEvidenceState: "missing",
        authority: {
          actor: "agent-2",
          credential: "cred-2",
          delegator: "ops-2",
          resource: "repo-b",
          action: "delete",
          validity: false,
          revocationState: "revoked",
          decision: "REVIEW",
        },
      },
      {
        id: "d3",
        enterpriseId: "ent-1",
        tenantId: "tenant-b",
        decision: "ALLOW",
        createdAt: "2026-09-20T05:00:00.000Z",
        governed: false,
        outOfScope: false,
        unauthorized: false,
        authorityIntegrity: true,
        evidenceComplete: true,
        replayAvailable: true,
        recoveryAvailable: true,
        providerEvidenceState: "present",
        authority: {
          actor: "agent-3",
          credential: "cred-3",
          delegator: "ops-3",
          resource: "repo-c",
          action: "read",
          validity: true,
          revocationState: "active",
          decision: "ALLOW",
        },
      },
    ],
    alerts: [
      { id: "a1", enterpriseId: "ent-1", tenantId: "tenant-a", status: "open", severity: "high", createdAt: "2026-09-10T10:01:00.000Z", resolvedAt: null },
      { id: "a2", enterpriseId: "ent-1", tenantId: "tenant-a", status: "resolved", severity: "medium", createdAt: "2026-09-10T11:00:00.000Z", resolvedAt: "2026-09-10T11:05:00.000Z" },
    ],
    reviews: [
      { id: "r1", enterpriseId: "ent-1", tenantId: "tenant-a", status: "resolved", createdAt: "2026-09-10T11:00:00.000Z", resolvedAt: "2026-09-10T11:10:00.000Z", decisionId: "d2" },
      { id: "r2", enterpriseId: "ent-1", tenantId: "tenant-a", status: "open", createdAt: "2026-09-11T00:00:00.000Z", resolvedAt: null, decisionId: "d1" },
    ],
    evidence: [
      { decisionId: "d1", enterpriseId: "ent-1", tenantId: "tenant-a", present: true },
      { decisionId: "d2", enterpriseId: "ent-1", tenantId: "tenant-a", present: false },
      { decisionId: "d3", enterpriseId: "ent-1", tenantId: "tenant-b", present: true },
    ],
    revocations: [
      { id: "rev-1", enterpriseId: "ent-1", tenantId: "tenant-a", decisionId: "d2", revokedAt: "2026-09-10T10:59:00.000Z", prevented: true },
    ],
    providerEvidence: [
      { decisionId: "d1", enterpriseId: "ent-1", tenantId: "tenant-a", state: "present" },
      { decisionId: "d2", enterpriseId: "ent-1", tenantId: "tenant-a", state: "missing" },
    ],
    credentialNegativeTests: [
      { id: "c1", enterpriseId: "ent-1", tenantId: "tenant-a", accepted: false, reason: "invalid_key" },
      { id: "c2", enterpriseId: "ent-1", tenantId: "tenant-a", accepted: true, reason: "revoked_key" },
    ],
  });

  assert.equal(snapshot.actionsGoverned, 2);
  assert.equal(snapshot.allowCount, 2);
  assert.equal(snapshot.reviewCount, 1);
  assert.equal(snapshot.denyCount, 0);
  assert.equal(snapshot.unauthorizedAllow, 0);
  assert.equal(snapshot.outOfScopeRejectionRate, 100);
  assert.equal(snapshot.revocationEffectiveness, 100);
  assert.equal(snapshot.credentialAbuseAcceptanceRate, 50);
  assert.equal(snapshot.tenantIsolationFailures, 0);
  assert.equal(snapshot.governedActionCoverage, 67);
  assert.equal(snapshot.authorityIntegrityRate, 67);
  assert.equal(snapshot.evidenceCoverage, 67);
  assert.equal(snapshot.replayCoverage, 67);
  assert.equal(snapshot.recoveryCoverage, 67);
  assert.equal(snapshot.reviewResolutionRate, 50);
  assert.equal(snapshot.medianReviewResolutionMs, 600000);
  assert.equal(snapshot.p95DecisionLatencyMs, 300000);
  assert.equal(snapshot.p99DecisionLatencyMs, 300000);
});
