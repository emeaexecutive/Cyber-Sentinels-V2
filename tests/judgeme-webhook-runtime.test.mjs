import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createJudgeMeWebhookHandler } from "../lib/providers/judgeme-webhook.ts";
import { readFile } from "node:fs/promises";
import { isJudgeMeWebhookCallback } from "../lib/providers/judgeme-route.ts";

const secret = "fixture-private-token";
const installation = { id: "11111111-1111-4111-8111-111111111111", enterpriseId: "22222222-2222-4222-8222-222222222222", shopDomain: "demo.myshopify.com", serviceSubjectId: "33333333-3333-4333-8333-333333333333", status: "active" };
const bodyObject = { shop_domain: installation.shopDomain, review: { id: "456", product_external_id: "123", rating: 5, verified: "verified-purchase", curated: "ok", hidden: false, created_at: "2026-10-02T11:00:00.000Z", updated_at: "2026-10-02T11:30:00.000Z", body: "must not be retained", reviewer: { email: "must-not-be-retained" } } };
const at = "2026-10-02T11:45:00.000Z";

test("middleware exempts only the exact Judge.me webhook POST route shape", async () => {
  const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /isJudgeMeWebhookCallback\(pathname, req\.method\)/);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/webhook/${installation.id}/review-created`, "POST"), true);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/webhook/${installation.id}/review-updated`, "POST"), true);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/webhook/${installation.id}/review-created-fail`, "POST"), true);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/webhook/${installation.id}/unknown`, "POST"), false);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/install`, "POST"), false);
  assert.equal(isJudgeMeWebhookCallback(`/api/providers/judgeme/webhook/${installation.id}/review-created`, "GET"), false);
});

function request(body = JSON.stringify(bodyObject), signingKey = secret) {
  const signature = createHmac("sha256", signingKey).update(Buffer.from(body)).digest("hex");
  return new Request("https://app.example.test/api/providers/judgeme/webhook", { method: "POST", headers: { "judgeme-hmac-sha256": signature, "content-type": "application/json" }, body });
}

function dependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    privateToken: () => secret,
    async loadInstallation(id) { calls.push("loadInstallation"); return id === installation.id ? installation : null; },
    async reserve(input) { calls.push("reserve"); calls.push(input); return { reserved: true, id: "ledger-row-1" }; },
    async complete(...args) { calls.push(["complete", ...args]); },
    async fetchReview(_installation, id) { calls.push(["fetchReview", id]); return { review: { ...bodyObject.review } }; },
    async persistEvidence(input) { calls.push(["persistEvidence", input]); return { evidenceReference: "evidence:1", receiptReference: "receipt:1", replayReference: "replay:1", trustMemoryReference: "memory:1" }; },
    now: () => new Date(at),
    ...overrides,
  };
}

test("signed webhook binds installed shop, refetches authoritative review, and persists sanitized evidence lineage", async () => {
  const deps = dependencies();
  const post = createJudgeMeWebhookHandler("review/created", deps);
  const response = await post(request(), installation.id);
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.receiptReference, "receipt:1");
  assert.equal(result.replayReference, "replay:1");
  assert.equal(result.trustMemoryReference, "memory:1");
  const persisted = deps.calls.find((call) => Array.isArray(call) && call[0] === "persistEvidence")[1];
  assert.equal(persisted.installation.enterpriseId, installation.enterpriseId);
  assert.equal(persisted.evidence.subject.type, "SERVICE");
  assert.equal(persisted.serverVerified, true);
  assert.equal(persisted.evidence.result, "INCONCLUSIVE");
  assert.equal(persisted.evidence.normalizedFacts.review.rating, 5);
  assert.equal("body" in persisted.evidence.normalizedFacts.review, false);
  assert.doesNotMatch(JSON.stringify(persisted), /must not be retained|must-not-be-retained|fixture-private-token/);
});

test("forged signatures, unknown installations, shop mismatch and review/product mismatch never persist", async () => {
  const badSignature = dependencies();
  const badResponse = await createJudgeMeWebhookHandler("review/created", badSignature)(new Request("https://app.example.test", { method: "POST", headers: { "judgeme-hmac-sha256": "0".repeat(64) }, body: JSON.stringify(bodyObject) }), installation.id);
  assert.equal(badResponse.status, 401);
  assert.equal(badSignature.calls.includes("reserve"), false);

  const unknown = dependencies();
  assert.equal((await createJudgeMeWebhookHandler("review/created", unknown)(request(), "44444444-4444-4444-8444-444444444444")).status, 404);
  assert.equal(unknown.calls.some((call) => Array.isArray(call) && call[0] === "persistEvidence"), false);

  const wrongShopBody = JSON.stringify({ ...bodyObject, shop_domain: "other.myshopify.com" });
  const wrongShop = dependencies();
  assert.equal((await createJudgeMeWebhookHandler("review/created", wrongShop)(request(wrongShopBody), installation.id)).status, 403);

  const mismatch = dependencies({ async fetchReview() { return { review: { ...bodyObject.review, product_external_id: "789" } }; } });
  assert.equal((await createJudgeMeWebhookHandler("review/created", mismatch)(request(), installation.id)).status, 503);
  assert.equal(mismatch.calls.some((call) => Array.isArray(call) && call[0] === "persistEvidence"), false);
});

test("duplicate deliveries use the shared ledger and do not refetch or repersist", async () => {
  const deps = dependencies({ async reserve() { this.calls.push("reserve"); return { reserved: false, status: "processed", duplicateOf: "ledger-row-1" }; } });
  const response = await createJudgeMeWebhookHandler("review/created", deps)(request(), installation.id);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.duplicate, true);
  assert.equal(deps.calls.some((call) => Array.isArray(call) && call[0] === "fetchReview"), false);
  assert.equal(deps.calls.some((call) => Array.isArray(call) && call[0] === "persistEvidence"), false);
});

test("a signed body replayed to a different event route collides in the shared ledger", async () => {
  let original;
  let persistCount = 0;
  const deps = dependencies({
    async reserve(input) {
      if (!original) { original = input; return { reserved: true, id: "ledger-row-1" }; }
      assert.equal(input.eventId, original.eventId);
      assert.notEqual(input.eventType, original.eventType);
      return { reserved: false, status: "payload_mismatch", duplicateOf: "ledger-row-1" };
    },
    async persistEvidence() { persistCount++; return { evidenceReference: "evidence:1", receiptReference: "receipt:1", replayReference: "replay:1", trustMemoryReference: "memory:1" }; },
  });
  const response = await createJudgeMeWebhookHandler("review/created", deps)(request(), installation.id);
  assert.equal(response.status, 201);
  original.eventType = "review/created";
  const replay = await createJudgeMeWebhookHandler("review/updated", deps)(request(), installation.id);
  assert.equal(replay.status, 409);
  assert.equal(persistCount, 1);
});

test("failed provider fetch can be reserved again once through the shared ledger retry path", async () => {
  let reservations = 0;
  let fetches = 0;
  const deps = dependencies({
    async reserve() { reservations++; return { reserved: true, id: "ledger-row-1", retry: reservations > 1 }; },
    async fetchReview() {
      fetches++;
      if (fetches === 1) throw new Error("temporary provider outage");
      return { review: { ...bodyObject.review } };
    },
  });
  const post = createJudgeMeWebhookHandler("review/created", deps);
  assert.equal((await post(request(), installation.id)).status, 503);
  assert.equal((await post(request(), installation.id)).status, 201);
  assert.equal(reservations, 2);
  assert.equal(fetches, 2);
  assert.ok(deps.calls.some((call) => Array.isArray(call) && call[0] === "complete" && call[3] === "failed"));
  assert.ok(deps.calls.some((call) => Array.isArray(call) && call[0] === "complete" && call[3] === "processed"));
});

test("event types are allowlisted and webhook timestamps fail closed when stale", async () => {
  assert.throws(() => createJudgeMeWebhookHandler("review/deleted", dependencies()), /JUDGEME_EVENT_UNSUPPORTED/);
  const stale = dependencies({ now: () => new Date("2026-10-03T12:00:00.000Z") });
  const response = await createJudgeMeWebhookHandler("review/created", stale)(request(), installation.id);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).stale, true);
  assert.equal(stale.calls.some((call) => Array.isArray(call) && call[0] === "persistEvidence"), false);
});