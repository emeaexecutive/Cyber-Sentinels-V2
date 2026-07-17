import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("RC7 evidence documents exist and retain the blocked operational truth", async () => {
  const required = [
    "docs/SPRINT_15_2_PRECONDITION_AUDIT.md",
    "docs/evidence/RC7_VALIDATION_EVIDENCE.md",
    "docs/evidence/RC7_PROVIDER_EXECUTION_EVIDENCE.md",
    "docs/evidence/RC7_DEPLOYED_SECURITY_EVIDENCE.md",
    "docs/evidence/RC7_PERFORMANCE_EVIDENCE.md",
    "docs/RC7_CONTROLLED_PILOT_DECISION.md",
    "docs/RC7_KNOWN_LIMITATIONS.md",
    "docs/RC7_CUSTOMER_PILOT_PREREQUISITES.md",
    "docs/demos/RC7_CONTROLLED_PILOT_EVIDENCE_DEMO.md",
    "docs/SPRINT_15_2_ACCEPTANCE.md",
    "docs/releases/RELEASE_1_0_RC7.md",
  ];
  const documents = await Promise.all(required.map(read));
  assert.equal(documents.length, required.length);
  assert.match(documents[0], /READY/);
  assert.match(documents[0], /CREDENTIALS_REQUIRED/);
  assert.match(documents[1], /Approved count \| 0/);
  assert.match(documents[2], /AWAITING CREDENTIALS/);
  assert.match(documents[3], /Not executed/);
  assert.match(documents[4], /Durable target sample count \| 0/);
  assert.match(documents[5], /CONTROLLED PILOT NOT APPROVED/);
});

test("RC7 dashboard and buyer journey expose evidence states without a Live claim", async () => {
  const [dashboard, evidence, buyer] = await Promise.all([
    read("app/admin/deployment-readiness/page.tsx"),
    read("lib/release-evidence/rc6.ts"),
    read("app/enterprise/pilot/page.tsx"),
  ]);
  assert.match(dashboard, /Release 1\.0 RC7/);
  assert.match(dashboard, /Controlled Pilot Evidence Gate/);
  assert.match(evidence, /1\.0-rc7/);
  for (const report of ["RC7_VALIDATION_EVIDENCE", "RC7_PROVIDER_EXECUTION_EVIDENCE", "RC7_DEPLOYED_SECURITY_EVIDENCE", "RC7_PERFORMANCE_EVIDENCE"]) assert.match(evidence, new RegExp(report));
  for (const state of ["Blocked", "Requires customer configuration", "Requires pilot evidence"]) assert.match(buyer, new RegExp(state));
  for (const section of ["Operational Trust Infrastructure", "What is proven", "Validation evidence", "Provider execution evidence", "Security evidence", "Performance evidence", "Known limitations", "Controlled pilot scope", "Customer prerequisites", "Request Pilot"]) assert.match(buyer, new RegExp(section));
  assert.equal((buyer.match(/Request Controlled Pilot/g) ?? []).length, 1);
});

test("external RC7 harnesses remain explicit opt-in", async () => {
  const [deployed, rls, load] = await Promise.all([
    read("scripts/deployed-security-harness.mjs"),
    read("tests/rls/rc6-denial.test.mjs"),
    read("scripts/rc6-load-harness.mjs"),
  ]);
  assert.match(deployed, /RUN_DEPLOYED_SECURITY_TESTS=true/);
  assert.match(rls, /RUN_RLS_TESTS=true/);
  assert.match(load, /RUN_LOAD_TESTS=true/);
  assert.match(load, /ALLOW_PAID_PROVIDER_LOAD_TEST/);
});
