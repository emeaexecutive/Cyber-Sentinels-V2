import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import { buildReleaseProofCases } from "../app/operational-entities/release-proof/release-proof-cases.ts";
import { projectCapabilityGovernanceUx, projectInterAgentConflictUx, projectOperationalGovernanceSummary } from "../lib/operational-entities/governance-ux.ts";

test("release proof derives every displayed result from the trust evaluators", () => {
  const cases = buildReleaseProofCases();
  assert.equal(cases.currentCapability.decision, "ALLOW");
  assert.equal(cases.hostedMissingCapability.decision, "REVIEW");
  assert.equal(cases.reauthorizationCapability.authorityImpact, "REAUTHORIZATION_REQUIRED");
  assert.equal(cases.compatibleConflict.conflictState, "NO_CONFLICT");
  assert.equal(cases.reviewConflict.decision, "REVIEW");
  assert.equal(cases.denyConflict.decision, "DENY");
  assert.equal(cases.unknownConflict.conflictState, "UNKNOWN");
  assert.equal(cases.trustMemory.length, 1);
  assert.equal(cases.canonicalTransaction.decision, "REVIEW");
  assert.equal(cases.canonicalTransaction.decisionTimeSnapshot.interAgentAuthorityConflict.digest, cases.reviewConflict.snapshot.digest);
  assert.ok(Object.isFrozen(cases.canonicalTransaction.decisionTimeSnapshot));
});

test("model UX keeps provider type descriptive and explains reauthorization in plain language", () => {
  const cases = buildReleaseProofCases();
  const current = projectCapabilityGovernanceUx(cases.currentCapability.snapshot);
  assert.equal(current.state, "Current");
  assert.match(current.classification, /Open Weight · descriptive only/);
  assert.match(current.explanation, /descriptive only/);

  const missing = projectCapabilityGovernanceUx(cases.hostedMissingCapability.snapshot);
  assert.equal(missing.state, "Review Required");
  assert.match(missing.explanation, /Provider reputation does not substitute for evidence/);

  const changed = projectCapabilityGovernanceUx(cases.reauthorizationCapability.snapshot);
  assert.equal(changed.state, "Reauthorization Required");
  assert.match(changed.explanation, /model artifact and environment changed/);
});

test("conflict UX renders compatible, review, deny, and unknown states without intent labels", () => {
  const cases = buildReleaseProofCases();
  assert.equal(projectInterAgentConflictUx({ snapshot: cases.compatibleConflict.snapshot, sourceName: "Beta", targetName: "Gamma" }).explanation,
    "Beta and Gamma access the same resource, but their authorized actions are compatible.");
  assert.equal(projectInterAgentConflictUx({ snapshot: cases.reviewConflict.snapshot, sourceName: "Beta", targetName: "Gamma" }).explanation,
    "Beta and Gamma have incompatible objectives affecting the same protected resource.");
  assert.equal(projectInterAgentConflictUx({ snapshot: cases.denyConflict.snapshot, sourceName: "Beta", targetName: "Gamma" }).explanation,
    "The requested action cannot proceed under the current authority and policy.");
  assert.equal(projectInterAgentConflictUx({ snapshot: cases.unknownConflict.snapshot, sourceName: "Beta", targetName: "Gamma" }).explanation,
    "Cyber Sentinels does not currently have sufficient evidence to establish whether these authorities are compatible.");
  const component = fs.readFileSync(new URL("../components/operational-entity-governance-summary.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /malicious|fraudulent|sabotage|collusion/i);
});

test("summary separates identity, authority, and operational trust without client override inputs", () => {
  const cases = buildReleaseProofCases();
  const summary = projectOperationalGovernanceSummary({
    identityStatus: "VERIFIED",
    authorityStatus: "ACTIVE",
    canonicalDecision: cases.reviewConflict.decision,
    interAgentConflict: cases.reviewConflict.snapshot,
  });
  assert.equal(summary.identity.label, "Verified");
  assert.equal(summary.authority.label, "Review Required");
  assert.equal(summary.operationalTrust.label, "Review required");
  assert.equal("clientTrustResult" in summary, false);
});

test("Operational Entity UX includes progressive disclosure, loading, error, and preview-only proof controls", () => {
  const component = fs.readFileSync(new URL("../components/operational-entity-governance-summary.tsx", import.meta.url), "utf8");
  const proof = fs.readFileSync(new URL("../app/operational-entities/release-proof/page.tsx", import.meta.url), "utf8");
  const loading = fs.readFileSync(new URL("../app/operational-entities/[entityId]/loading.tsx", import.meta.url), "utf8");
  const error = fs.readFileSync(new URL("../app/operational-entities/[entityId]/error.tsx", import.meta.url), "utf8");
  const middleware = fs.readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
  for (const label of ["View evidence", "View authority lineage", "Open Replay", "View transaction"]) assert.match(component, new RegExp(label));
  assert.match(component, /focus-visible:outline/);
  assert.match(proof, /VERCEL_ENV !== "preview"/);
  assert.match(proof, /No decision result is hard-coded/);
  assert.match(middleware, /pathname === "\/operational-entities\/release-proof"[\s\S]*VERCEL_ENV === "preview"/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(error, /No trust result has been inferred/);
});
