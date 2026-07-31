import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  choicesForConsentAction,
  consentDecisionState,
  consentRetryDelayRemainingMs,
  consentRetryIsDue,
  consentSavedToastSessionPrefix,
  consentSyncMaximumAttempts,
  createLocalConsentReceipt,
  effectiveConsentChoices,
  markConsentPersisted,
  markConsentSyncAttempt,
  markConsentSyncFailure,
  markConsentSyncRejected,
  parseLocalConsentReceipt,
} from "../src/lib/consent/local-state.ts";
import { canonicalCookieChoices, cookieConsentAction, validateCookieConsentRequest } from "../src/lib/consent/cookie-contract.ts";
import { normalizeConsentPersistResult } from "../src/lib/consent/persistence-result.ts";
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

test("accept, reject, and custom choices close against an idle receipt immediately", () => {
  const accepted = makeReceipt("ACCEPT_ALL");
  assert.deepEqual(accepted.choices, { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true });
  assert.equal(accepted.status, "idle");
  assert.equal(consentDecisionState(accepted), "accepted");
  const rejected = makeReceipt("REJECT_OPTIONAL");
  assert.deepEqual(rejected.choices, strict);
  assert.equal(consentDecisionState(rejected), "rejected");
  const custom = choicesForConsentAction("SAVE_PREFERENCES", { ...strict, functional: true, analytics: true });
  assert.equal(custom.functional, true);
  assert.equal(custom.analytics, true);
  assert.equal(custom.marketing, false);
  assert.equal(consentDecisionState(makeReceipt("SAVE_PREFERENCES", custom)), "customized");
  assert.equal(consentDecisionState(null), "undecided");
});

test("server failure is fail-closed while the browser choice remains valid", () => {
  const syncing = markConsentSyncAttempt(makeReceipt("ACCEPT_ALL"), new Date("2026-07-21T10:01:00Z"));
  const pending = markConsentSyncFailure(syncing);
  assert.equal(syncing.status, "syncing");
  assert.equal(pending.status, "retry_scheduled");
  assert.deepEqual(effectiveConsentChoices(pending), strict);
  assert.equal(parseLocalConsentReceipt(JSON.stringify(pending), "policy-v1", new Date("2026-07-21T10:02:00Z")).state, "valid");
});

test("permanent receipt rejection stops retries and keeps optional tracking disabled", () => {
  const syncing = markConsentSyncAttempt(makeReceipt("ACCEPT_ALL"));
  const rejected = markConsentSyncRejected(syncing);
  assert.equal(rejected.status, "rejected");
  assert.equal(consentRetryDelayRemainingMs(rejected), null);
  assert.deepEqual(effectiveConsentChoices(rejected), strict);
});

test("background receipt retry uses 5s, 30s, 2m, and 10m backoff then stops", () => {
  const receipt = makeReceipt();
  assert.equal(consentRetryDelayRemainingMs(receipt, new Date("2026-07-21T10:00:00Z")), 0);
  let pending = markConsentSyncFailure(markConsentSyncAttempt(receipt, new Date("2026-07-21T10:00:00Z")));
  assert.equal(pending.idempotencyKey, receipt.idempotencyKey);
  assert.equal(consentRetryDelayRemainingMs(pending, new Date("2026-07-21T10:00:01Z")), 4_000);
  assert.equal(consentRetryIsDue(pending, new Date("2026-07-21T10:00:05Z")), true);
  pending = markConsentSyncFailure(markConsentSyncAttempt(pending, new Date("2026-07-21T10:00:05Z")));
  assert.equal(consentRetryDelayRemainingMs(pending, new Date("2026-07-21T10:00:05Z")), 30_000);
  pending = markConsentSyncFailure(markConsentSyncAttempt(pending, new Date("2026-07-21T10:00:35Z")));
  assert.equal(consentRetryDelayRemainingMs(pending, new Date("2026-07-21T10:00:35Z")), 120_000);
  pending = markConsentSyncFailure(markConsentSyncAttempt(pending, new Date("2026-07-21T10:02:35Z")));
  assert.equal(consentRetryDelayRemainingMs(pending, new Date("2026-07-21T10:02:35Z")), 600_000);
  pending = markConsentSyncFailure(markConsentSyncAttempt(pending, new Date("2026-07-21T10:12:35Z")));
  assert.equal(pending.retryCount, consentSyncMaximumAttempts);
  assert.equal(pending.status, "failed_terminal");
  assert.equal(consentRetryDelayRemainingMs(pending), null);
});

test("confirmed receipt records its server ID, clears retry state, and enables only recorded choices", () => {
  const receipt = makeReceipt("SAVE_PREFERENCES", { ...strict, analytics: true });
  const persisted = markConsentPersisted(receipt, "server-receipt-1");
  assert.equal(persisted.status, "synced");
  assert.equal(persisted.serverReceiptId, "server-receipt-1");
  assert.equal(effectiveConsentChoices(persisted).analytics, true);
  assert.equal(effectiveConsentChoices(persisted).marketing, false);
  assert.equal(consentRetryDelayRemainingMs(persisted), null);
});

test("stale, expired, corrupt, and old-policy local choices require a fresh choice", () => {
  const receipt = makeReceipt();
  assert.equal(parseLocalConsentReceipt(JSON.stringify(receipt), "new-policy").state, "stale");
  assert.equal(parseLocalConsentReceipt(JSON.stringify(receipt), "policy-v1", new Date("2027-12-01T00:00:00Z")).state, "stale");
  assert.equal(parseLocalConsentReceipt("not-json", "policy-v1").state, "missing");
  assert.equal(parseLocalConsentReceipt(JSON.stringify({ ...receipt, choices: null }), "policy-v1").state, "missing");
});

test("legacy receipt states migrate without reopening the main banner", () => {
  const receipt = makeReceipt();
  const pending = parseLocalConsentReceipt(JSON.stringify({ ...receipt, status: "pending_sync", retryCount: 1 }), "policy-v1");
  const exhausted = parseLocalConsentReceipt(JSON.stringify({ ...receipt, status: "pending_sync", retryCount: 5 }), "policy-v1");
  const persisted = parseLocalConsentReceipt(JSON.stringify({ ...receipt, status: "persisted", serverReceiptId: "server-1" }), "policy-v1");
  assert.equal(pending.receipt?.status, "retry_scheduled");
  assert.equal(exhausted.receipt?.status, "failed_terminal");
  assert.equal(persisted.receipt?.status, "synced");
});

test("every valid synchronization state preserves the browser decision across remounts", () => {
  for (const action of ["ACCEPT_ALL", "REJECT_OPTIONAL", "SAVE_PREFERENCES"]) {
    const choices = action === "SAVE_PREFERENCES" ? { ...strict, functional: true } : strict;
    const receipt = makeReceipt(action, choices);
    for (const status of ["idle", "syncing", "retry_scheduled", "synced", "failed_terminal", "rejected"]) {
      const remounted = parseLocalConsentReceipt(JSON.stringify({
        ...receipt,
        status,
        retryCount: status === "failed_terminal" ? consentSyncMaximumAttempts : receipt.retryCount,
      }), "policy-v1");
      assert.equal(remounted.state, "valid", `${action}/${status} remains a valid local decision`);
      assert.notEqual(consentDecisionState(remounted.receipt), "undecided", `${action}/${status} keeps the banner closed`);
    }
  }
});

test("banner existence depends only on readiness and decision state", async () => {
  const manager = await readFile(new URL("../src/components/consent/ConsentManager.tsx", import.meta.url), "utf8");
  assert.match(manager, /const showConsentBanner = ready && decisionState === "undecided";/);
  assert.match(manager, /if \(showConsentBanner\) return <ConsentBanner state=\{saving \? "saving" : "open"\}/);
  assert.doesNotMatch(manager, /decisionState === "undecided" \|\| saving/);
  assert.match(manager, /function openPreferences\(\) \{\s*setError\(null\);\s*setManaging\(true\);\s*\}/);
  assert.doesNotMatch(manager, /function openPreferences\(\)[\s\S]{0,160}setDecisionState/);
  assert.match(manager, /announceReceiptUpdate\(receipt\);\s*void syncReceipt\(receipt\);/);
});

test("public cookie contract maps aliases into the canonical consent model", () => {
  const input = validateCookieConsentRequest({ consentVersion: "policy-v1", anonymousId: uuids[0], idempotencyKey: uuids[1], source: "cookie_preferences", choices: { necessary: true, preferences: true, analytics: true, marketing: false, aiImprovements: false } });
  assert.deepEqual(canonicalCookieChoices(input), { essential: true, functional: true, analytics: true, ai_improvements: false, marketing: false });
  assert.equal(cookieConsentAction(input), "SAVE_PREFERENCES");
  assert.throws(() => validateCookieConsentRequest({ ...input, choices: { ...input.choices, necessary: false } }), /choices/i);
});

test("saved toast is temporary, action-deduplicated, route-stable, and non-blocking", async () => {
  const manager = await readFile(new URL("../src/components/consent/ConsentManager.tsx", import.meta.url), "utf8");
  const status = await readFile(new URL("../src/components/consent/ConsentStatus.tsx", import.meta.url), "utf8");
  const localState = await readFile(new URL("../src/lib/consent/local-state.ts", import.meta.url), "utf8");
  assert.match(manager, /setDecisionState\(consentDecisionState\(receipt\)\)/);
  assert.match(manager, /savedToastDurationMs = 5_000/);
  assert.match(manager, /role="status"/);
  assert.match(manager, /aria-live="polite"/);
  assert.match(manager, /aria-label="Dismiss saved preferences notification"/);
  assert.match(manager, /pointer-events-none/);
  assert.match(manager, /window\.sessionStorage/);
  assert.match(manager, /receiptId/);
  assert.match(manager, /hydratedRef/);
  assert.match(manager, /consentRetryDelayRemainingMs/);
  assert.match(manager, /window\.setTimeout/);
  assert.match(manager, /setSavedToast\(null\)/);
  assert.match(manager, /applyConsentState\(strictConsentChoices\)/);
  assert.match(manager, /cs:open-consent-preferences/);
  assert.match(manager, /Privacy choice saved and receipt persisted\./);
  assert.match(manager, /Privacy choice stored locally\. Receipt synchronisation is pending\./);
  assert.match(manager, /Receipt persistence is temporarily unavailable\./);
  assert.match(manager, /server rejected its receipt\./);
  assert.doesNotMatch(manager, /data-state="retryable"/);
  assert.doesNotMatch(manager, /Your privacy choice is saved in this browser|receipt waits to sync/i);
  assert.match(status, /Retry receipt sync/);
  assert.match(status, /Receipt status:/);
  assert.match(status, /Saved and persisted/);
  assert.match(status, /Stored locally; retry scheduled/);
  assert.match(status, /Stored locally; persistence temporarily unavailable/);
  assert.match(status, /Stored locally; receipt rejected/);
  assert.match(localState, /"idle" \| "syncing" \| "retry_scheduled" \| "synced" \| "failed_terminal" \| "rejected"/);
  assert.equal(consentSavedToastSessionPrefix, "cookie_preferences_saved:");
  assert.match(manager, /eventType: "consent\.receipt\.sync_failed"/);
  assert.match(manager, /errorCategory:/);
  assert.match(manager, /finalOutcome:/);
});

test("consent persistence normalises stable camelCase and legacy snake_case RPC results", () => {
  const common = {
    status: "CREATED",
    categories: strict,
  };
  const camel = normalizeConsentPersistResult({
    ...common,
    receiptId: uuids[0],
    receiptHash: "a".repeat(64),
    expiresAt: "2027-01-01T00:00:00.000Z",
  });
  const snake = normalizeConsentPersistResult({
    ...common,
    receipt_id: uuids[0],
    receipt_hash: "a".repeat(64),
    expires_at: "2027-01-01T00:00:00.000Z",
  });
  assert.deepEqual(snake, camel);
});

test("consent persistence validates duplicate, conflict, and malformed RPC results", () => {
  const duplicate = normalizeConsentPersistResult({
    status: "DUPLICATE",
    receiptId: uuids[0],
    receiptHash: "b".repeat(64),
    expiresAt: "2027-01-01T00:00:00.000Z",
    categories: strict,
  });
  assert.equal(duplicate.status, "DUPLICATE");
  assert.deepEqual(normalizeConsentPersistResult({ status: "CONFLICT", receipt_id: uuids[0] }), {
    status: "CONFLICT",
    receiptId: uuids[0],
  });
  assert.throws(() => normalizeConsentPersistResult({ status: "CREATED" }), /receiptId/);
  assert.throws(() => normalizeConsentPersistResult({ status: "CREATED", receiptId: "undefined" }), /receiptId/);
  assert.throws(() => normalizeConsentPersistResult({
    status: "CREATED",
    receiptId: uuids[0],
    receiptHash: "c".repeat(64),
    expiresAt: "2027-01-01T00:00:00.000Z",
    categories: {},
  }), /categories/);
});

test("consent 503 logging keeps correlation and safe Supabase diagnostics server-side", async () => {
  const repository = await readFile(new URL("../src/lib/consent/repository.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/consent/cookies/route.ts", import.meta.url), "utf8");
  for (const field of ["correlationId", "operation", "internalCode", "status", "errorName", "environment", "targetType", "target", "supabaseCode", "supabaseMessage", "supabaseDetails", "supabaseHint"]) {
    assert.match(repository, new RegExp(`${field}:`));
  }
  assert.match(repository, /trust_event_chain_heads/);
  assert.match(repository, /persist_consent_change_v1/);
  assert.match(repository, /\[email\]/);
  assert.match(repository, /\[uuid\]/);
  assert.match(repository, /\[redacted\]/);
  assert.match(route, /reasonCode: "CONSENT_RECEIPT_PERSISTENCE_UNAVAILABLE"/);
  assert.doesNotMatch(route, /supabaseMessage|supabaseDetails|supabaseHint/);
});

test("public route is anonymous, idempotent, IP-minimised, and reuses the consent service", async () => {
  const route = await readFile(new URL("../app/api/consent/cookies/route.ts", import.meta.url), "utf8");
  assert.match(route, /resolveConsentContext\(request, body\.anonymousId\)/);
  assert.match(route, /persistConsentChoice/);
  assert.match(route, /idempotencyKey: body\.idempotencyKey/);
  assert.doesNotMatch(route, /membership|member_of|raw.?ip|x-forwarded-for/i);
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

test("hiring migration guards absent legacy interview columns", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202606090001_hiring_security_interview_integrity.sql", import.meta.url), "utf8");
  assert.match(migration, /information_schema\.columns[\s\S]*column_name = 'candidate_id'[\s\S]*column_name = 'candidate_profile_id'/i);
  assert.match(migration, /execute \$sql\$[\s\S]*set candidate_id = coalesce\(candidate_id, candidate_profile_id\)[\s\S]*candidate_profile_id is not null[\s\S]*\$sql\$/i);
  assert.match(migration, /Skipped legacy candidate_profile_id backfill: one or both columns are absent\./);
  assert.match(migration, /column_name = 'status'[\s\S]*set session_status = coalesce\(session_status, status, 'scheduled'\)/i);
  assert.doesNotMatch(migration, /add column if not exists candidate_profile_id/i);
});
