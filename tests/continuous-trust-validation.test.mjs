import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import { buildRegulatedAiAgentDemo, executeTrustLifecycle } from "../lib/core/trust-lifecycle-orchestrator.ts";
import { datasetRegistry } from "../lib/validation/dataset-registry.ts";
import { createTrustMemoryEvent, validateTrustMemoryIntegrity } from "../lib/trust-memory/trust-memory.ts";
import { getSlowestRuntimeOperations } from "../lib/performance/runtime-profiler.ts";

function percentile(values, rank) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * rank) - 1)] ?? 0;
}

test("regulated AI-agent demo exposes allow, review and block proof", () => {
  const allowed = buildRegulatedAiAgentDemo("allow");
  const reviewed = buildRegulatedAiAgentDemo("review");
  const blocked = buildRegulatedAiAgentDemo("block");

  assert.equal(allowed.trust_decision, "allow");
  assert.equal(reviewed.trust_decision, "review");
  assert.ok(["deny", "block"].includes(blocked.trust_decision));
  for (const result of [allowed, reviewed, blocked]) {
    assert.ok(result.replay_reference);
    assert.ok(result.evidence_graph_reference);
    assert.ok(result.trust_memory_reference);
    assert.ok(result.execution_receipt_reference);
    assert.equal(result.continuity.tenant_isolated, true);
    assert.equal(result.continuity.valid, true);
    assert.ok(result.provider_reality.some((provider) => provider.state === "Awaiting Credentials"));
  }
});

test("dataset manifests expose required governance fields without claiming benchmark eligibility", () => {
  assert.equal(datasetRegistry.length, 12);
  for (const manifest of datasetRegistry) {
    for (const field of ["datasetId", "datasetVersion", "category", "provenanceSource", "licenceStatus", "consentStatus", "dataSensitivity", "groundTruthMethod", "reviewerCount", "labelConfidence", "sampleCount", "benchmarkEligibility", "providerCoverage", "limitations"]) {
      assert.ok(Object.hasOwn(manifest, field), `${manifest.datasetId} missing ${field}`);
    }
  }
  assert.equal(datasetRegistry.some((manifest) => manifest.benchmarkEligibility), false);
});

test("Trust Memory integrity validates chronology, references, attribution, isolation and append-only IDs", () => {
  const event = createTrustMemoryEvent({
    id: "memory-integrity-1",
    actor_id: "agent-1",
    actor_type: "ai_agent",
    workflow_id: "workflow-1",
    event_kind: "provider_conflict",
    trust_state_before: "current",
    trust_state_after: "review_required",
    reason: "Provider results conflicted and governance review was opened.",
    evidence_refs: ["evidence-1"],
    replay_refs: ["replay-1"],
    governance_refs: ["governance-1"],
    provider_refs: ["provider-a", "provider-b"],
    reviewed_outcome_ref: "review-1",
    confidence_before: 0.8,
    confidence_after: 0.58,
    tenant_id: "tenant-1",
    created_at: "2026-07-12T12:00:00.000Z",
  });
  const integrity = validateTrustMemoryIntegrity([event], { tenantId: "tenant-1" });
  assert.equal(integrity.valid, true);
  assert.equal(validateTrustMemoryIntegrity([event, event], { tenantId: "tenant-1" }).checks.appendOnlyIds, false);
  assert.equal(validateTrustMemoryIntegrity([{ ...event, tenant_id: "tenant-2" }], { tenantId: "tenant-1" }).checks.tenantIsolationPreserved, false);
});

test("failure modes fail safely and preserve evidence references", () => {
  for (const failureInjection of ["provider_timeout", "provider_conflict", "duplicate_event", "out_of_order_event", "replay_write_failure", "trust_memory_write_failure", "governance_queue_delay", "cache_miss"]) {
    const base = buildRegulatedAiAgentDemo("review");
    const result = executeTrustLifecycle({
      tenantId: "tenant-failure",
      entityId: "agent-failure",
      entityType: "ai_agent",
      workflowId: `workflow-${failureInjection}`,
      lifecycleStage: "runtime_trust",
      requestedAction: "export_regulated_report",
      authorityContext: { owner: "Test Enterprise", humanAuthority: "Reviewer", authenticated: true, requestedPurpose: "regulated_financial_review", allowedActions: ["export_regulated_report"], allowedPurposes: ["regulated_financial_review"], delegationValid: true, nonce: `nonce-${failureInjection}` },
      providerSignals: [{ providerName: "Test provider", state: "Test Mode", identityConfidence: 0.8, evidenceReferences: ["evidence-provider"] }],
      runtimeContext: { sessionIntegrity: 0.7, anomalyRisk: 0.4, evidenceReferences: ["evidence-runtime"], failureInjection },
      policyContext: { policyVersion: "test-0.9.3", minimumEvidence: 2, validationStatus: "incomplete" },
      correlationId: `failure-${failureInjection}`,
    });
    assert.ok(result.evidence_references.length >= 2);
    if (["replay_write_failure", "trust_memory_write_failure"].includes(failureInjection)) assert.equal(result.trust_decision, "block");
    assert.ok(base.engine_trace.length === result.engine_trace.length);
  }
});

test("local simulated lifecycle loads at 10, 100 and 500 executions", () => {
  const findings = [];
  for (const count of [10, 100, 500]) {
    const latencies = [];
    let failures = 0;
    for (let index = 0; index < count; index += 1) {
      const start = performance.now();
      try {
        buildRegulatedAiAgentDemo(index % 3 === 0 ? "review" : index % 7 === 0 ? "block" : "allow");
      } catch {
        failures += 1;
      }
      latencies.push(performance.now() - start);
    }
    findings.push({ count, averageMs: Number((latencies.reduce((sum, value) => sum + value, 0) / count).toFixed(3)), p95Ms: Number(percentile(latencies, 0.95).toFixed(3)), failureRate: failures / count });
  }
  console.log(`SPRINT_9_3_LOCAL_LOAD=${JSON.stringify(findings)}`);
  console.log(`SPRINT_9_3_SLOWEST=${JSON.stringify(getSlowestRuntimeOperations(10))}`);
  assert.equal(findings.every((finding) => finding.failureRate === 0), true);
});
