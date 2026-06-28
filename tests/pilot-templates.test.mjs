import assert from "node:assert/strict";
import test from "node:test";
import {
  getOperationalPilotTemplate,
  operationalPilotTemplates,
} from "../lib/pilot-templates.ts";

test("provides the five supported operational pilot workflows", () => {
  assert.deepEqual(
    operationalPilotTemplates.map((template) => template.id),
    [
      "hiring_security",
      "executive_approval",
      "enterprise_onboarding",
      "session_integrity",
      "governance_escalation",
    ]
  );
});

test("every pilot template defines start, evolution, replay, governance and outcome", () => {
  for (const template of operationalPilotTemplates) {
    assert.ok(template.workflowStart);
    assert.ok(template.trustEvolution);
    assert.ok(template.replayChronology);
    assert.ok(template.governanceIntervention);
    assert.ok(template.finalOutcome);
    assert.ok(template.evidenceExpected.length > 0);
  }
});

test("unknown template values fall back to hiring security", () => {
  assert.equal(getOperationalPilotTemplate("unknown").id, "hiring_security");
});

