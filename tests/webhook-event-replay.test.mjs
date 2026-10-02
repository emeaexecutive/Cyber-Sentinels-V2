import assert from "node:assert/strict";
import test from "node:test";
import { classifyWebhookReplay } from "../lib/webhooks/replay.ts";

const incoming = { eventType: "review/created", payloadHash: "a".repeat(64) };

test("webhook replay requires matching event type and raw payload digest", () => {
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "processed" }, incoming), "duplicate");
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "processed" }, { ...incoming, payloadHash: "b".repeat(64) }), "payload_mismatch");
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "processed" }, { ...incoming, eventType: "review/updated" }), "payload_mismatch");
});

test("only an identical failed webhook event is eligible for a controlled retry", () => {
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "failed" }, incoming), "retry");
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "processing" }, incoming), "in_progress");
  assert.equal(classifyWebhookReplay({ ...incoming, processingStatus: "received" }, incoming), "in_progress");
});