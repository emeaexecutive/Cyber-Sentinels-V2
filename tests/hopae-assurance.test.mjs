import assert from "node:assert/strict";
import test from "node:test";
import { calculateHopaeIdentityAssurance } from "../lib/hopae-assurance.ts";

test("maps Hopae LoA to identity assurance without auto-approval", () => {
  const result = calculateHopaeIdentityAssurance({
    completed: true,
    loa: 4,
    providerId: "example-eid",
    provenance: { credentials: [{ type: "IdentityCredential" }] },
  });
  assert.deepEqual(result, {
    uplift: 30,
    provenanceConfidence: true,
    decision: "manual_review",
  });
});

test("caps uplift at ten when provenance credentials are missing", () => {
  const result = calculateHopaeIdentityAssurance({ completed: true, loa: 4 });
  assert.equal(result.uplift, 10);
  assert.equal(result.provenanceConfidence, false);
  assert.equal(result.decision, "manual_review");
});

test("does not uplift incomplete verifications", () => {
  assert.equal(calculateHopaeIdentityAssurance({ completed: false, loa: 4 }).uplift, 0);
});
