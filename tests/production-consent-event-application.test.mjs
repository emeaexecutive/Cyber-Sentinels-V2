import assert from "node:assert/strict";
import Module from "node:module";
import { mock, test } from "node:test";
import { fileURLToPath } from "node:url";

process.env.NODE_PATH = fileURLToPath(new URL("./fixtures", import.meta.url));
Module._initPaths();

const persisted = [];
let chainHead = { sequence: 0, eventHash: null };

const repository = {
  async chainHead() {
    return chainHead;
  },
  async persist(input) {
    persisted.push(input);
    const last = input.trustEvents.at(-1);
    chainHead = { sequence: last.sequence, eventHash: last.eventHash };
    return {
      status: "CREATED",
      receiptId: input.receipt.receiptId,
      receiptHash: input.receipt.receiptHash,
      expiresAt: input.receipt.expiresAt,
      categories: input.receipt.categories,
    };
  },
};

mock.module(new URL("../src/lib/consent/repository.ts", import.meta.url).href, {
  namedExports: { consentRepository: () => repository },
});

const { persistConsentChoice } = await import("../src/lib/consent/service.ts");

const enterpriseId = "10000000-0000-4000-8000-000000001255";
const context = {
  enterpriseId,
  userId: null,
  anonymousToken: "synthetic-anonymous-token-1255",
  anonymousIdHash: "a".repeat(64),
  subjectKey: `anonymous:${"a".repeat(64)}`,
  relatedSubjectKeys: [`anonymous:${"a".repeat(64)}`],
  regionProfile: "GLOBAL_DEFAULT",
  coarseCountry: null,
  language: "en",
  userAgentHash: null,
};

const cases = [
  ["ACCEPT_ALL", { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true }],
  ["REJECT_OPTIONAL", { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false }],
  ["SAVE_PREFERENCES", { essential: true, functional: true, analytics: false, ai_improvements: true, marketing: false }],
  ["WITHDRAW", { essential: true, functional: false, analytics: false, ai_improvements: false, marketing: false }],
];

test("persistConsentChoice produces the exact consent events used by the SQL rehearsal", async () => {
  for (const [index, [action, choices]] of cases.entries()) {
    await persistConsentChoice({
      context,
      action,
      choices,
      policyVersion: "2026-07-20.1",
      idempotencyKey: `rehearsal-${index}-${crypto.randomUUID()}`,
      correlationId: crypto.randomUUID(),
      source: "cookie_banner",
    });
  }

  assert.equal(persisted.length, cases.length);
  for (const [index, input] of persisted.entries()) {
    const [actionEvent, receiptEvent] = input.trustEvents;
    assert.equal(actionEvent.eventType, {
      ACCEPT_ALL: "consent.accept_all",
      REJECT_OPTIONAL: "consent.reject_optional",
      SAVE_PREFERENCES: "consent.preferences.saved",
      WITHDRAW: "consent.withdrawn",
    }[cases[index][0]]);
    assert.equal(receiptEvent.eventType, "consent.receipt.created");
    assert.deepEqual(actionEvent.reasonCodes, [`CONSENT_${cases[index][0]}`]);
    assert.deepEqual(receiptEvent.reasonCodes, ["CONSENT_RECEIPT_INTEGRITY_RECORDED"]);
    for (const event of input.trustEvents) {
      assert.equal(event.provider.key, "cyber_sentinels_consent");
      assert.equal(event.provider.protocol, "UNSIGNED");
      assert.equal(event.provider.serverVerified, true);
      assert.equal(event.workflow, null);
      assert.equal(event.session, null);
      assert.equal(event.authority, null);
      assert.deepEqual(event.normalizedFacts.categories, input.receipt.categories);
      assert.match(event.eventHash, /^[a-f0-9]{64}$/);
    }
  }
});
