import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { classifyEvidenceIndependence } from "../lib/operational-entities/federated-evidence.ts";

const root = path.resolve(import.meta.dirname, "..");
const registryPath = path.join(root, "config", "product-capabilities.json");
const allowedLevels = new Set([
  "WORKING",
  "PARTIALLY_IMPLEMENTED",
  "CONTRACT_ONLY",
  "UI_ONLY",
  "TEXT_ONLY",
  "NOT_IMPLEMENTED",
  "STAGING_PROVEN",
  "LIVE_PROVIDER_PROVEN",
]);
const requiredFields = ["name", "publicClaim", "implementationModule", "algorithm", "tests", "api", "ui", "persistence", "providerDependency", "qualificationLevel"];

async function registry() {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

test("every product capability has one allowed qualification and the required truth fields", async () => {
  const entries = await registry();
  assert.ok(Array.isArray(entries) && entries.length >= 20, "The registry must cover the material product surface.");
  assert.equal(new Set(entries.map((entry) => entry.name)).size, entries.length, "Capability names must be unique.");
  for (const entry of entries) {
    for (const field of requiredFields) assert.ok(Object.hasOwn(entry, field), `${entry.name ?? "unnamed"} is missing ${field}.`);
    assert.ok(allowedLevels.has(entry.qualificationLevel), `${entry.name} has an unsupported qualification.`);
    assert.ok(entry.publicClaim.trim(), `${entry.name} needs bounded public copy.`);
    assert.ok(entry.algorithm.trim(), `${entry.name} needs an algorithm or an explicit non-algorithm contract.`);
    for (const field of ["tests", "api", "ui", "persistence"]) assert.ok(Array.isArray(entry[field]), `${entry.name}.${field} must be an array.`);
  }
});

test("all source, UI, API, test and qualification-evidence references exist", async () => {
  for (const entry of await registry()) {
    const references = [entry.implementationModule, ...entry.tests, ...entry.api, ...entry.ui, ...(entry.qualificationEvidence ? [entry.qualificationEvidence] : [])];
    for (const reference of references) {
      await assert.doesNotReject(access(path.join(root, reference)), `${entry.name} references missing path ${reference}.`);
    }
  }
});

test("WORKING claims have executable coverage and cannot be text-only declarations", async () => {
  for (const entry of (await registry()).filter((item) => item.qualificationLevel === "WORKING")) {
    assert.ok(entry.tests.length, `${entry.name} cannot be WORKING without an executable test.`);
    assert.ok(entry.implementationModule, `${entry.name} cannot be WORKING without implementation.`);
    assert.ok(entry.api.length || entry.ui.length, `${entry.name} cannot be WORKING without a reachable surface.`);
  }
});

test("continuous, AI and provider-proof claims carry their required qualification evidence", async () => {
  const entries = await registry();
  const continuous = entries.find((entry) => entry.name === "Continuous trust evaluation");
  assert.ok(continuous?.continuousTrigger?.length, "Continuous trust requires a non-UI trigger declaration.");
  assert.ok(continuous.continuousTrigger.some((trigger) => /signal|cron|job/i.test(trigger)), "Continuous trust must identify a signal or scheduled job trigger.");

  const ai = entries.find((entry) => entry.name === "Grounded AI governance assistance");
  assert.ok(ai?.modelPath, "AI claims require an implemented model path.");
  assert.match(ai.algorithm, /allowlist|citation/i, "AI claims require evidence grounding and citation validation.");

  for (const entry of entries.filter((item) => item.qualificationLevel === "LIVE_PROVIDER_PROVEN")) {
    assert.ok(entry.providerDependency, `${entry.name} needs a named provider dependency.`);
    assert.ok(entry.qualificationEvidence, `${entry.name} needs retained live-provider evidence.`);
  }
});

test("the material high-risk claim vocabulary is covered and provider IDs stay non-canonical", async () => {
  const entries = await registry();
  const claims = entries.map((entry) => `${entry.name} ${entry.publicClaim}`).join("\n").toLowerCase();
  for (const term of ["operational entity", "identity", "deepfake", "accountab", "authority", "evidence", "consequence", "continuous", "drift", "health", "confidence", "stability", "prediction", "recovery", "narrative", "recommendation", "ai", "blast radius", "cascade", "outcome", "replay", "trust memory"]) {
    assert.match(claims, new RegExp(term), `Registry coverage is missing ${term}.`);
  }
  const entitySource = await readFile(path.join(root, "lib", "operational-entities", "operational-entity.ts"), "utf8");
  assert.match(entitySource, /provider-native identity is evidence about an Operational Entity/i);
  const resolverSource = entitySource.slice(entitySource.indexOf("export function resolveOperationalEntity"), entitySource.indexOf("export function createOperationalActionEnvelope"));
  assert.doesNotMatch(resolverSource, /providerEntityId|builderPlatform/, "Provider-native identifiers must not resolve the canonical entity.");
});

test("same-party evidence can never satisfy an independently-confirmed claim", () => {
  const sameParty = [
    { evidenceId: "evidence:a", providerId: "provider:a", sourcePartyId: "party:a", sourceClassification: "provider_asserted", claim: "success" },
    { evidenceId: "evidence:b", providerId: "provider:a", sourcePartyId: "party:a", sourceClassification: "runtime_observed", claim: "success" },
  ];
  const classification = classifyEvidenceIndependence({ evidence: sameParty, controlOperator: "party:a", technologyProvider: "party:a" });
  assert.equal(classification, "same_party_multi_system");
  assert.notEqual(classification, "independently_confirmed");
});
