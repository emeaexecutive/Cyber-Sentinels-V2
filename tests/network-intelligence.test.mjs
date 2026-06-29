import assert from "node:assert/strict";
import test from "node:test";
import { aggregateNetworkIntelligence } from "../lib/network-intelligence.ts";

const observation = (id, overrides = {}) => ({
  id,
  workflowId: `private-workflow-${id}`,
  workflowType: "candidate",
  kind: "session_integrity_failure",
  outcome: "review_required",
  occurredAt: `2026-01-01T10:0${id}:00.000Z`,
  provider: null,
  evidenceReferences: [`private-evidence-${id}`],
  governanceAction: "Assign reviewer",
  explanation: "Retained operational fixture.",
  trustDelta: -2,
  simulated: false,
  ...overrides,
});

test("suppresses a network signal below the minimum cohort", () => {
  const summary = aggregateNetworkIntelligence([
    observation("1"),
    observation("2"),
  ]);
  const signal = summary.signals.find(
    (item) => item.id === "session_integrity_instability"
  );

  assert.equal(signal?.suppressed, true);
  assert.equal(signal?.count, null);
  assert.equal(summary.minimumCohortSize, 3);
});

test("returns category aggregation without workflow or evidence identifiers", () => {
  const summary = aggregateNetworkIntelligence([
    observation("1"),
    observation("2"),
    observation("3"),
  ]);
  const serialized = JSON.stringify(summary);

  assert.equal(
    summary.signals.find((item) => item.id === "session_integrity_instability")
      ?.count,
    3
  );
  assert.equal(serialized.includes("private-workflow"), false);
  assert.equal(serialized.includes("private-evidence"), false);
  assert.equal(summary.boundaries.identitiesExcluded, true);
});

test("keeps simulated observations separate and explicitly labelled", () => {
  const observations = [
    observation("1", { simulated: true }),
    observation("2", { simulated: true }),
    observation("3", { simulated: true }),
  ];
  const live = aggregateNetworkIntelligence(observations);
  const simulation = aggregateNetworkIntelligence(observations, {
    simulated: true,
  });

  assert.equal(live.observationCount, 0);
  assert.equal(simulation.observationCount, 3);
  assert.equal(
    simulation.signals
      .find((item) => item.id === "session_integrity_instability")
      ?.sourceClasses.includes("simulated"),
    true
  );
});
