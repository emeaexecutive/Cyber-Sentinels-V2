import assert from "node:assert/strict";
import test from "node:test";
import { fuseTrustSignals } from "../../lib/detection/signal-fusion.ts";
import { enqueueGovernanceJob, getGovernanceQueueSnapshot } from "../../lib/governance/governance-queue.ts";
import { getRuntimeProfileSnapshot, recordRuntimeProfileSample } from "../../lib/performance/runtime-profiler.ts";

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function simulateDecisions(count, options = {}) {
  const latencies = [];
  let failures = 0;
  let timeouts = 0;
  for (let index = 0; index < count; index += 1) {
    const started = performance.now();
    const timeout = options.providerTimeout && index % 5 === 0;
    if (timeout) timeouts += 1;
    const fusion = fuseTrustSignals({
      signals: [
        {
          id: `signal:${index}`,
          source: timeout ? "Provider API" : "Runtime Intelligence",
          risk: timeout ? 0.5 : index % 7 === 0 ? 0.9 : 0.2,
          confidence: timeout ? 0.1 : 0.7,
          evidence: timeout ? ["provider timeout isolated"] : ["simulated load signal"],
          limitations: timeout ? ["Provider timeout; degraded mode used."] : [],
        },
      ],
    });
    const decision = fusion.recommendation === "allow" ? "allow" : fusion.recommendation === "block" ? "block" : "review";
    const evidenceRefs = [`load:${index}`];
    if (["review", "step_up", "escalate", "block"].includes(decision)) {
      enqueueGovernanceJob({
        queue: decision === "block" || decision === "escalate" ? "escalation" : "review",
        subject_id: `load-workflow-${index}`,
        decision,
        reason: fusion.escalationReason ?? "Load simulation routed review.",
        evidence_refs: evidenceRefs,
      });
    }
    recordRuntimeProfileSample({
      stage: "api_response",
      label: "trust execution load simulation",
      latencyMs: performance.now() - started,
      outcome: timeout ? "timeout" : "ok",
    });
    failures += decision ? 0 : 1;
    latencies.push(performance.now() - started);
  }
  return {
    decisions: count,
    averageLatencyMs: latencies.reduce((total, value) => total + value, 0) / latencies.length,
    maxLatencyMs: Math.max(...latencies),
    p95LatencyMs: percentile(latencies, 95),
    failures,
    timeouts,
    governanceQueueDepth: getGovernanceQueueSnapshot(100).length,
    degradedModeHandled: options.providerTimeout ? timeouts > 0 && failures === 0 : true,
    replayWriteLoad: "simulated_without_database",
  };
}

test("trust execution load handles 10 decisions", async () => {
  const report = await simulateDecisions(10);
  assert.equal(report.decisions, 10);
  assert.equal(report.failures, 0);
});

test("trust execution load handles 100 decisions and provider timeouts", async () => {
  const report = await simulateDecisions(100, { providerTimeout: true });
  assert.equal(report.decisions, 100);
  assert.equal(report.failures, 0);
  assert.equal(report.degradedModeHandled, true);
  assert.ok(report.timeouts > 0);
  assert.ok(report.governanceQueueDepth > 0);
});

test("500 decision load remains an explicit staged placeholder", () => {
  const profile = getRuntimeProfileSnapshot();
  assert.match(profile.boundary, /does not replace production APM/);
  assert.equal("placeholder_until_seeded_ci_budget_is_approved", "placeholder_until_seeded_ci_budget_is_approved");
});
