import assert from "node:assert/strict";
import test from "node:test";
import { buildQualificationPlan, classifyAlternativeProviders } from "../tools/production-qualification-path.cjs";

test("buildQualificationPlan emits the credential-gated sequence and alternative-provider assessment", () => {
  const plan = buildQualificationPlan({
    hopaeConfigured: false,
    hopaeAccessPending: true,
    stripeIdentitySupported: true,
    worldIdSupported: true,
  });

  assert.deepEqual(plan.sequence.slice(0, 4), [
    "CONFIGURE ENV",
    "REDEPLOY",
    "PROVIDER HEALTH",
    "REAL VERIFICATION",
  ]);
  assert.equal(plan.hopaeStatus, "WAITING ON PROVIDER ACCESS");
  assert.equal(plan.workflowStatus, "PARTIAL");

  const alternatives = classifyAlternativeProviders();
  assert.equal(alternatives.stripeIdentity.status, "PARTIAL");
  assert.equal(alternatives.worldId.status, "PARTIAL");
  assert.equal(alternatives.bestFallback, "WORLD ID");
});
