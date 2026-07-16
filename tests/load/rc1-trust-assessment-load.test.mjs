import assert from "node:assert/strict";
import test from "node:test";

import { executeCanonicalTrustAssessment } from "../../lib/core/trust-lifecycle-orchestrator.ts";
import { evaluateProviderEvidenceQuality, normalizeHopaeProviderEvidence } from "../../lib/providers/hopae-rc1.ts";

function percentile(values, rank) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil((rank / 100) * ordered.length) - 1)];
}

test("RC1 approved Test Mode profile measures 100 in-process trust assessments", (context) => {
  const samples = [];
  let failures = 0;
  let timeouts = 0;
  for (let index = 0; index < 100; index += 1) {
    const started = performance.now();
    const timeout = index % 10 === 0;
    if (timeout) timeouts += 1;
    const receivedAt = new Date().toISOString();
    const evidence = normalizeHopaeProviderEvidence({
      statusPayload: { status: timeout ? "unavailable" : "completed", verification_model: "hopae-approved-fixture-v1" },
      userInfo: { hopae_loa: 4, provenance: { issuer: "approved-test-fixture" } },
      providerReference: `hopae-load-${index}`,
      correlationId: `rc1-load-${index}`,
      tenantId: "11111111-1111-4111-8111-111111111111",
      workflowId: "22222222-2222-4222-8222-222222222222",
      sourceMode: "test",
      runtimeState: timeout ? "Unavailable" : "Test Mode",
      receivedAt,
      latencyMs: timeout ? 8000 : 40 + (index % 5),
    });
    const evidenceQuality = evaluateProviderEvidenceQuality({
      evidence,
      expectedTenantId: evidence.tenantId,
      expectedWorkflowId: evidence.workflowId,
      expectedCorrelationId: evidence.correlationId,
    });
    const result = executeCanonicalTrustAssessment({
      tenantId: evidence.tenantId,
      workflowId: evidence.workflowId,
      entityId: "33333333-3333-4333-8333-333333333333",
      entityType: "human",
      requestedAction: "assess_trust",
      requestedPurpose: "regulated_workflow",
      correlationId: evidence.correlationId,
      nonce: `nonce-${index}`,
      owner: "RC1 Load Enterprise",
      accountableActor: "RC1 Load Reviewer",
      allowedActions: ["assess_trust"],
      allowedPurposes: ["regulated_workflow"],
      delegationValid: true,
      policyVersion: "rc1-load-policy-v1",
      evidence,
      evidenceQuality,
      createdAt: new Date().toISOString(),
    });
    if (!result.trust_decision) failures += 1;
    samples.push({ total: performance.now() - started, ...result.performance });
  }
  const totals = samples.map((sample) => sample.total);
  const report = {
    environment: "local approved Test Mode; in-process; no database or external provider calls",
    sampleCount: samples.length,
    averageMs: Number((totals.reduce((sum, value) => sum + value, 0) / totals.length).toFixed(3)),
    p50Ms: Number(percentile(totals, 50).toFixed(3)),
    p95Ms: Number(percentile(totals, 95).toFixed(3)),
    timeoutRate: timeouts / samples.length,
    errorRate: failures / samples.length,
    stageAveragesMs: Object.fromEntries(
      ["provider", "consensus", "entity_identity", "trust_engine", "authorization", "enforcement", "replay", "governance", "trust_memory", "evidence_graph", "evidence_pack"].map((stage) => {
        const values = samples.map((sample) => Number(sample[stage] ?? 0));
        return [stage, Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))];
      })
    ),
  };
  context.diagnostic(JSON.stringify(report));
  assert.equal(report.sampleCount, 100);
  assert.equal(report.errorRate, 0);
  assert.equal(report.timeoutRate, 0.1);
  assert.ok(report.p95Ms >= report.p50Ms);
});
