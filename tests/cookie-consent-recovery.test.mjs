import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  choicesForConsentAction,
  consentRetryIsDue,
  createLocalConsentReceipt,
  effectiveConsentChoices,
  markConsentPersisted,
  markConsentSyncAttempt,
  parseLocalConsentReceipt,
} from "../src/lib/consent/local-state.ts";
import { canonicalCookieChoices, cookieConsentAction, validateCookieConsentRequest } from "../src/lib/consent/cookie-contract.ts";
import { consentDefaults } from "../src/lib/consent/policy.ts";

const strict = consentDefaults("GLOBAL_DEFAULT");
const uuids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];
const makeReceipt = (action = "REJECT_OPTIONAL", choices = strict) => {
  let index = 0;
  return createLocalConsentReceipt({ action, choices, consentVersion: "policy-v1", source: "cookie_banner", now: new Date("2026-07-21T10:00:00Z"), randomUuid: () => uuids[index++] });
};

test("accept, reject, and custom choices create a local pending receipt immediately", () => {
  const accepted = makeReceipt("ACCEPT_ALL");
  assert.deepEqual(accepted.choices, { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true });
  assert.equal(accepted.status, "pending_sync");
  assert.deepEqual(makeReceipt("REJECT_OPTIONAL").choices, strict);
  const custom = choicesForConsentAction("SAVE_PREFERENCES", { ...strict, functional: true, analytics: true });
  assert.equal(custom.functional, true);
  assert.equal(custom.analytics, true);
  assert.equal(custom.marketing, false);
});

test("server failure is fail-closed while a browser choice remains valid", () => {
  const pending = markConsentSyncAttempt(makeReceipt("ACCEPT_ALL"), new Date("2026-07-21T10:01:00Z"));
  assert.equal(pending.status, "pending_sync");
  assert.deepEqual(effectiveConsentChoices(pending), strict);
  assert.equal(parseLocalConsentReceipt(JSON.stringify(pending), "policy-v1", new Date("2026-07-21T10:02:00Z")).state, "valid");
});

test("receipt retry preserves its idempotency key and honors backoff", () => {
  const receipt = makeReceipt();
  const attempted = markConsentSyncAttempt(receipt, new Date("2026-07-21T10:00:00Z"));
  const retried = markConsentSyncAttempt(attempted, new Date("2026-07-21T10:03:00Z"));
  assert.equal(retried.idempotencyKey, receipt.idempotencyKey);
  assert.equal(consentRetryIsDue(attempted, new Date("2026-07-21T10:01:00Z")), false);
  assert.equal(consentRetryIsDue(attempted, new Date("2026-07-21T10:02:01Z")), true);
});

test("confirmed receipt enables only the recorded optional categories", () => {
  const receipt = makeReceipt("SAVE_PREFERENCES", { ...strict, analytics: true });
  const persisted = markConsentPersisted(receipt, "server-receipt-1");
  assert.equal(effectiveConsentChoices(persisted).analytics, true);
  assert.equal(effectiveConsentChoices(persisted).marketing, false);
});

test("stale, expired, corrupt, and old-policy local choices require a fresh choice", () => {
  const receipt = makeReceipt();
  assert.equal(parseLocalConsentReceipt(JSON.stringify(receipt), "new-policy").state, "stale");
  assert.equal(parseLocalConsentReceipt(JSON.stringify(receipt), "policy-v1", new Date("2027-12-01T00:00:00Z")).state, "stale");
  assert.equal(parseLocalConsentReceipt("not-json", "policy-v1").state, "missing");
  assert.equal(parseLocalConsentReceipt(JSON.stringify({ ...receipt, choices: null }), "policy-v1").state, "missing");
});

test("public cookie contract maps aliases into the canonical consent model", () => {
  const input = validateCookieConsentRequest({ consentVersion: "policy-v1", anonymousId: uuids[0], idempotencyKey: uuids[1], source: "cookie_preferences", choices: { necessary: true, preferences: true, analytics: true, marketing: false, aiImprovements: false } });
  assert.deepEqual(canonicalCookieChoices(input), { essential: true, functional: true, analytics: true, ai_improvements: false, marketing: false });
  assert.equal(cookieConsentAction(input), "SAVE_PREFERENCES");
  assert.throws(() => validateCookieConsentRequest({ ...input, choices: { ...input.choices, necessary: false } }), /choices/i);
});

test("public route is anonymous, idempotent, IP-minimised, and reuses the consent service", async () => {
  const route = await readFile(new URL("../app/api/consent/cookies/route.ts", import.meta.url), "utf8");
  const manager = await readFile(new URL("../src/components/consent/ConsentManager.tsx", import.meta.url), "utf8");
  assert.match(route, /resolveConsentContext\(request, body\.anonymousId\)/);
  assert.match(route, /persistConsentChoice/);
  assert.match(route, /idempotencyKey: body\.idempotencyKey/);
  assert.doesNotMatch(route, /membership|member_of|raw.?ip|x-forwarded-for/i);
  assert.match(manager, /persistBrowserReceipt\(receipt\)/);
  assert.match(manager, /setUiState\("closed"\)/);
  assert.match(manager, /applyConsentState\(consentDefaults\("GLOBAL_DEFAULT"\)\)/);
  assert.match(manager, /Retry receipt sync/);
  assert.match(manager, /cs:open-consent-preferences/);
  assert.match(manager, /data-state="retryable"/);
  assert.match(manager, /data-state="closed"/);
  assert.match(manager, /automaticRetryStarted/);
});

test("existing consent migrations retain narrow append-only RLS and no duplicate cookie ledger", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202607200002_enterprise_trust_consent_manager.sql", import.meta.url), "utf8");
  assert.match(migration, /consent_preferences','consent_receipts','consent_events'/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.%I from anon, authenticated/i);
  assert.match(migration, /consent_receipts_append_only before update or delete/i);
  assert.match(migration, /users read own consent receipts/i);
  assert.match(migration, /persist_consent_change_v1/i);
});
