import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PROVIDER_CLASSES,
  referenceProviderAdapters,
} from "../lib/providers/adapters.ts";

const occurredAt = "2026-08-20T08:00:00.000Z";

test("one provider adapter contract covers all required reference provider classes", async () => {
  assert.deepEqual(PROVIDER_CLASSES, [
    "IDENTITY_PROVIDER", "RUNTIME_SECURITY_PROVIDER", "AI_ASSURANCE_PROVIDER", "AI_ASSISTANCE_PROVIDER", "APPLICATION_SIGNAL", "EDR_PROVIDER",
    "DSPM_PROVIDER", "NETWORK_SECURITY_PROVIDER", "ROBOTICS_RUNTIME_PROVIDER", "ROBOTICS_SAFETY_PROVIDER",
    "SENSOR_EVIDENCE_PROVIDER", "MODEL_EVALUATION_PROVIDER", "EDGE_ATTESTATION_PROVIDER", "OUTCOME_PROVIDER",
  ]);
  const expected = new Map([
    ["neuraltrust-compatible-test-provider", "RUNTIME_SECURITY_PROVIDER"],
    ["mythos-compatible-test-provider", "AI_ASSURANCE_PROVIDER"],
    ["identity-compatible-test-provider", "IDENTITY_PROVIDER"],
    ["cyera-compatible-test-provider", "DSPM_PROVIDER"],
    ["robotics-sensor-test-provider", "SENSOR_EVIDENCE_PROVIDER"],
    ["destination-outcome-test-provider", "OUTCOME_PROVIDER"],
  ]);
  for (const [key, providerClass] of expected) {
    const adapter = referenceProviderAdapters[key];
    assert.equal(adapter.providerClass, providerClass);
    assert.equal(typeof adapter.validate, "function");
    assert.equal(typeof adapter.verify, "function");
    assert.equal(typeof adapter.normalize, "function");
    assert.equal(typeof adapter.mapEvidence, "function");
    const mapped = await adapter.mapEvidence({
      providerKey: key,
      eventId: `${key}:event-001`,
      subject: { type: "AI_AGENT", id: "agent:alpha" },
      evidenceType: "PROVIDER_OBSERVATION",
      finding: "BLOCK",
      evidence: { finding: "BLOCK", confidence: 0.99 },
      occurredAt,
    }, occurredAt);
    assert.equal(mapped.result, "INCONCLUSIVE");
    assert.equal(mapped.serverVerified, false);
    assert.equal(mapped.cryptographicallyVerified, false);
    assert.ok(mapped.reasonCodes.includes("PROVIDER_FINDING_IS_NOT_A_CYBER_SENTINELS_DECISION"));
    assert.equal(Object.hasOwn(mapped, "decision"), false);
  }
  for (const providerClass of expected.values()) assert.ok(PROVIDER_CLASSES.includes(providerClass));
});

test("unified evidence ingestion rejects caller authority and persists only canonical evidence objects", async () => {
  const runtime = await readFile(new URL("../lib/public-api/v1/runtime.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/v1/evidence/route.ts", import.meta.url), "utf8");
  assert.match(runtime, /assertNoCallerAuthorityClaims\(body\)/);
  assert.match(runtime, /CALLER_AUTHORITY_CLAIM_REJECTED/);
  assert.match(runtime, /from\("evidence_objects"\)\.insert/);
  assert.doesNotMatch(runtime, /ValeEvidenceGraph|ValeReceiptStore|ProviderDecisionEngine/);
  assert.match(route, /scopes: \["evidence:write"\]/);
});

test("canonical persistence owns VALE context, provider evidence and execution continuity", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260820085027_vale_canonical_provider_preview.sql", import.meta.url), "utf8");
  for (const column of ["continuity_signals", "provider_neutral_evidence", "deployment_gate", "execution_continuity"]) assert.match(migration, new RegExp(column));
  assert.match(migration, /canonical_trust_transactions/);
  assert.doesNotMatch(migration, /create table[^;]*(?:vale|provider).*receipt/is);
});
