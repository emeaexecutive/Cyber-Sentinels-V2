import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { normalizeTrustAlert } from "../src/lib/continuous-trust/alert-contract.ts";

test("normalizes alert title and description from canonical alert fields", () => {
  const normalized = normalizeTrustAlert({
    alert_type: "verification_failure",
    alert_title: "Provider evidence stale",
    alert_description: "Evidence freshness fell below policy.",
    severity: "high",
  });

  assert.equal(normalized.title, "Provider evidence stale");
  assert.equal(normalized.description, "Evidence freshness fell below policy.");
  assert.equal(normalized.alert_title, "Provider evidence stale");
  assert.equal(normalized.alert_description, "Evidence freshness fell below policy.");
});

test("falls back to alternate title and description fields when canonical fields are missing", () => {
  const normalized = normalizeTrustAlert({
    title: "Runtime drift detected",
    description: "The trust state drifted from the previous evaluation.",
    summary: "Review the transition and evidence chain.",
  });

  assert.equal(normalized.title, "Runtime drift detected");
  assert.equal(normalized.description, "The trust state drifted from the previous evaluation.");
  assert.equal(normalized.alert_title, "Runtime drift detected");
  assert.equal(normalized.alert_description, "The trust state drifted from the previous evaluation.");
});

test("normalizes historical records and null fields without losing evidence references", () => {
  const normalized = normalizeTrustAlert({
    alert_type: "runtime_drift",
    title: "Historical runtime drift",
    description: null,
    evidence_references: ["evidence:one", "evidence:two"],
    detected_at: "2026-09-04T10:00:00.000Z",
  });

  assert.equal(normalized.title, "Historical runtime drift");
  assert.equal(normalized.description, "Review the alert context before changing workflow state.");
  assert.deepEqual(normalized.evidence_refs, ["evidence:one", "evidence:two"]);
  assert.equal(normalized.created_at, "2026-09-04T10:00:00.000Z");
});

test("forward migration makes canonical alert fields authoritative without breaking legacy rows", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20260904100313_normalize_continuous_trust_alert_contract.sql", import.meta.url),
    "utf8",
  );

  assert.match(migration, /alert_title[\s\S]*set not null/i);
  assert.match(migration, /title[\s\S]*drop not null/i);
  assert.match(migration, /coalesce\([\s\S]*alert_title[\s\S]*title/i);
});
