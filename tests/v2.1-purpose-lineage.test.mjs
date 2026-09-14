import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePurposeLineage } from "../src/lib/trust-fabric/purpose-lineage.ts";

test("declared purpose matching authority and action is ALLOW", () => {
  const result = evaluatePurposeLineage({
    authorityObjective: "research_repository",
    actionPurpose: "research_repository",
    context: { declaredPurpose: "research_repository", observedPurpose: "research_repository" },
  });
  assert.equal(result.decision, "ALLOW");
  assert.ok(result.reasonCodes.includes("DECLARED_PURPOSE_VERIFIED"));
  assert.ok(result.reasonCodes.includes("PURPOSE_CONTINUITY_CONFIRMED"));
});

test("purpose drift beyond authority becomes DENY without inferring intent", () => {
  const result = evaluatePurposeLineage({
    authorityObjective: "research_repository",
    actionPurpose: "research_repository",
    context: { declaredPurpose: "research_repository", observedPurpose: "credential_harvesting" },
  });
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.reasonCodes.includes("PURPOSE_DRIFT"));
  assert.equal(result.reasonCodes.some((code) => /MALICIOUS|FRAUD|IMPERSONATOR/.test(code)), false);
});

test("credential harvesting outside declared purpose is DENY", () => {
  const result = evaluatePurposeLineage({
    authorityObjective: "research_repository",
    actionPurpose: "research_repository",
    context: { declaredPurpose: "research_repository", credentialInteraction: "credential_harvesting" },
  });
  assert.equal(result.decision, "DENY");
  assert.ok(result.reasonCodes.includes("CREDENTIAL_ACCESS_OUTSIDE_DECLARED_PURPOSE"));
});

test("cross-provider incomplete context is correlated without automatic attribution", () => {
  const result = evaluatePurposeLineage({
    authorityObjective: "research_repository",
    actionPurpose: "research_repository",
    context: {
      declaredPurpose: "research_repository",
      providerObservations: [
        { providerId: "provider_a", observedPurpose: "research_repository", completeContext: true, attributionEstablished: false },
        { providerId: "provider_b", observedPurpose: "research_repository", completeContext: false, attributionEstablished: false },
      ],
    },
  });
  assert.equal(result.decision, "REVIEW");
  assert.equal(result.correlation, "CAMPAIGN_CORRELATION");
  assert.equal(result.attribution, "NOT_ESTABLISHED");
  assert.ok(result.reasonCodes.includes("PROVIDER_VIEW_INCOMPLETE"));
  assert.ok(result.reasonCodes.includes("IDENTITY_FRAGMENTATION"));
});

test("missing purpose context preserves existing behavior", () => {
  assert.equal(evaluatePurposeLineage({ authorityObjective: "research_repository", actionPurpose: "research_repository" }), null);
});

test("caller-forged purpose evidence is rejected at the boundary", () => {
  assert.throws(() => evaluatePurposeLineage({
    authorityObjective: "research_repository",
    actionPurpose: "research_repository",
    context: { declaredPurpose: "research_repository", purposeEvidence: ["Bearer forged-secret"] },
  }), /PURPOSE_EVIDENCE_INVALID/);
});
