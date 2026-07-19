import assert from "node:assert/strict";
import test from "node:test";
import { IdentitySignalOrchestrator, orchestrateIdentityVerification } from "../lib/identity-signals/orchestrator.ts";

function fakeRepository() {
  const state = { request: null, evidence: [], confidence: null };
  return { state,
    async findRequest(_enterprise, key) { return state.request?.idempotency_key === key ? state.request : null; },
    async assertSubject() {},
    async createRequest(input) { state.request = { id: "11111111-1111-4111-8111-111111111111", correlation_id: "22222222-2222-4222-8222-222222222222", idempotency_key: input.idempotencyKey, request_hash: input.requestHash }; return state.request; },
    async saveCollection(input) { state.evidence.push(input.result.evidence); return input.result.evidence; },
    async finalize(input) { state.confidence = input.confidence; state.request.status = input.requestStatus; return input.confidence; },
    async requestDetails() { return { request: state.request, transactions: [], evidence: state.evidence, confidence: state.confidence }; },
  };
}

const blockedAdapter = {
  providerId: "email",
  signals: ["EMAIL_OWNERSHIP"],
  async getCapabilities() { return [{ providerId: "email", signalType: "EMAIL_OWNERSHIP", implementationStatus: "PARTIALLY_IMPLEMENTED", runtimeStatus: "DISABLED", serverVerified: false, limitations: [] }]; },
  async healthCheck() { return { providerId: "email", available: false, state: "DISABLED", reasonCode: "PROVIDER_NOT_CONFIGURED", checkedAt: new Date().toISOString() }; },
  async collectSignal(signalType) { return { transactionStatus: "BLOCKED", errorCode: "PROVIDER_NOT_CONFIGURED", limitations: ["No provider."], evidence: { signalType, providerId: "email", status: "BLOCKED", outcome: "BLOCKED", confidence: 0, riskScore: null, riskFlags: [], serverVerified: false, signatureVerified: false, providerEventId: null, providerReference: null, providerTransactionId: null, providerRequestId: null, payloadHash: null, normalizedValue: null, provenance: { source: "none", mappingVersion: "identity-signal-v1", collectedAt: new Date().toISOString() }, reasonCodes: ["PROVIDER_NOT_CONFIGURED"], limitations: ["No provider."], observedAt: new Date().toISOString() } }; },
  async verifyCallback() { return []; },
};

test("orchestration persists truthful blocked evidence and returns idempotent replay", async () => {
  const repository = fakeRepository();
  const input = { repository, adapters: [blockedAdapter], enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["EMAIL_OWNERSHIP"], purpose: "employment", idempotencyKey: "request-key-001", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: {} };
  const first = await orchestrateIdentityVerification(input);
  const second = await orchestrateIdentityVerification(input);
  assert.equal(first.replayed, false);
  assert.equal(first.details.request.status, "PARTIAL");
  assert.equal(first.details.confidence.score, 0);
  assert.equal(second.replayed, true);
  assert.equal(second.reasonCode, "IDEMPOTENT_REPLAY_RETURNED");
  assert.equal(repository.state.evidence.length, 1);
});

test("idempotency key reuse with a changed request fails closed", async () => {
  const repository = fakeRepository();
  const base = { repository, adapters: [blockedAdapter], enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["EMAIL_OWNERSHIP"], purpose: "employment", idempotencyKey: "request-key-002", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: {} };
  await orchestrateIdentityVerification(base);
  await assert.rejects(() => orchestrateIdentityVerification({ ...base, purpose: "account-recovery" }), (error) => error.code === "IDEMPOTENCY_CONFLICT" && error.status === 409);
});

test("provider timeout is isolated, persisted, and returns partial completion", async () => {
  const repository = fakeRepository();
  const timeoutAdapter = {
    providerId: "slow_provider",
    signals: ["EMAIL_OWNERSHIP"],
    async getCapabilities() { return [{ providerId: "slow_provider", signalType: "EMAIL_OWNERSHIP", implementationStatus: "IMPLEMENTED", runtimeStatus: "AVAILABLE", serverVerified: true, limitations: [] }]; },
    async healthCheck() { return { providerId: "slow_provider", available: true, state: "HEALTHY", reasonCode: null, checkedAt: new Date().toISOString() }; },
    async collectSignal() { return new Promise(() => {}); },
    async verifyCallback() { return []; },
  };
  const orchestrator = new IdentitySignalOrchestrator({ repository, adapters: [timeoutAdapter], providerTimeoutMs: 100 });
  const result = await orchestrator.execute({ enterpriseId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", subjectId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", requestedSignals: ["EMAIL_OWNERSHIP"], purpose: "employment", idempotencyKey: "request-key-timeout", actorId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", signalInputs: {} });
  assert.equal(result.status, "PARTIAL");
  assert.equal(repository.state.evidence[0].status, "UNAVAILABLE");
  assert.deepEqual(repository.state.evidence[0].reasonCodes, ["PROVIDER_TIMEOUT"]);
  assert.equal(repository.state.confidence.score, 0);
});
