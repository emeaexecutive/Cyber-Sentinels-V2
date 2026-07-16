import { mkdir, writeFile } from "node:fs/promises";
import { executeCanonicalTrustAssessment } from "../lib/core/trust-lifecycle-orchestrator.ts";
import { evaluateProviderEvidenceQuality, normalizeHopaeProviderEvidence } from "../lib/providers/hopae-rc1.ts";

if (process.env.RUN_LOAD_TESTS !== "true") { process.stderr.write("Blocked: RUN_LOAD_TESTS=true is required.\n"); process.exit(2); }
const scenario = process.env.LOAD_SCENARIO || "complete-mocked-trust-flow";
const allowed = new Set(["trust-decision-only", "replay-write", "evidence-graph-write", "trust-memory-write", "complete-mocked-trust-flow", "readiness-dashboard-query"]);
if (!allowed.has(scenario)) throw new Error("Unsupported LOAD_SCENARIO.");
if (process.env.ALLOW_PAID_PROVIDER_LOAD_TEST === "true") throw new Error("Paid-provider load is not implemented by this safe harness; no provider call was made.");
const count = Math.max(1, Math.min(5000, Number(process.env.LOAD_SAMPLE_COUNT || 100)));
const concurrency = Math.max(1, Math.min(50, Number(process.env.LOAD_CONCURRENCY || 5)));
const durations = []; let failures = 0; let timeouts = 0;
const runOne = async (index) => {
  const started = performance.now();
  try {
    if (scenario === "readiness-dashboard-query") {
      const base = process.env.STAGING_BASE_URL; if (!base) throw new Error("STAGING_BASE_URL is required.");
      const response = await fetch(`${base.replace(/\/$/, "")}/admin/deployment-readiness`, { headers: process.env.LOAD_TEST_SESSION_COOKIE ? { cookie: process.env.LOAD_TEST_SESSION_COOKIE } : {}, redirect: "manual" });
      if (response.status >= 500) throw new Error(`Dashboard returned ${response.status}.`);
    } else {
      const evidence = normalizeHopaeProviderEvidence({ statusPayload: { status: "completed" }, userInfo: { hopae_loa: 3 }, providerReference: `mock:${index}`, correlationId: `load:${index}`, tenantId: "11111111-1111-4111-8111-111111111111", workflowId: "22222222-2222-4222-8222-222222222222", sourceMode: "test", runtimeState: "Test Mode", receivedAt: new Date().toISOString(), latencyMs: 1 });
      const quality = evaluateProviderEvidenceQuality({ evidence, expectedTenantId: evidence.tenantId, expectedWorkflowId: evidence.workflowId, expectedCorrelationId: evidence.correlationId });
      executeCanonicalTrustAssessment({ tenantId: evidence.tenantId, workflowId: evidence.workflowId, entityId: "33333333-3333-4333-8333-333333333333", entityType: "ai_agent", requestedAction: "assess_trust", requestedPurpose: "load_test", correlationId: evidence.correlationId, nonce: `nonce:${index}`, owner: "RC6 load fixture", accountableActor: "load-operator", allowedActions: ["assess_trust"], allowedPurposes: ["load_test"], delegationValid: true, policyVersion: "load:1", evidence, evidenceQuality: quality, createdAt: new Date().toISOString() });
    }
  } catch { failures += 1; } finally { durations.push(performance.now() - started); }
};
for (let offset = 0; offset < count; offset += concurrency) await Promise.all(Array.from({ length: Math.min(concurrency, count - offset) }, (_, index) => runOne(offset + index)));
const sorted = [...durations].sort((a, b) => a - b); const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
const elapsedSeconds = durations.reduce((sum, item) => sum + item, 0) / 1000;
const report = { schemaVersion: 1, scenario, sampleCount: count, concurrency, throughputPerSecond: Number((count / Math.max(elapsedSeconds / concurrency, 0.001)).toFixed(2)), averageMs: Number((durations.reduce((sum, item) => sum + item, 0) / count).toFixed(3)), p50Ms: count >= 30 ? Number(pct(0.5).toFixed(3)) : null, p95Ms: count >= 30 ? Number(pct(0.95).toFixed(3)) : null, p99Ms: count >= 100 ? Number(pct(0.99).toFixed(3)) : null, timeoutRate: timeouts / count, errorRate: failures / count, environment: process.env.STAGING_BASE_URL || "local safe mocked flow", buildVersion: process.env.DEPLOYED_BUILD_VERSION || "local-unversioned", limitations: ["No paid provider calls", "Staging results are not production SLAs", "Write scenarios exercise the canonical mocked Trust Fabric unless an explicit dashboard target is selected"] };
await mkdir("test-results", { recursive: true }); await writeFile("test-results/rc6-load-result.json", `${JSON.stringify(report, null, 2)}\n`); process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (failures) process.exitCode = 1;
