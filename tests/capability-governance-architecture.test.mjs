import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const capability = readFileSync("lib/operational-entities/capability-governance.ts", "utf8");
const conflict = readFileSync("lib/operational-entities/inter-agent-authority-conflict.ts", "utf8");
const canonical = readFileSync("src/lib/trust-transaction/canonical.ts", "utf8");
const evidence = readFileSync("lib/operational-entities/federated-evidence.ts", "utf8");
const entityMigration = readFileSync("supabase/migrations/202608080001_provider_neutral_evidence_independence.sql", "utf8");
const transactionMigration = readFileSync("supabase/migrations/202608060002_end_to_end_trust_transaction.sql", "utf8");
const page = readFileSync("app/operational-entities/[entityId]/page.tsx", "utf8");
const governanceSummary = readFileSync("components/operational-entity-governance-summary.tsx", "utf8");
const registry = readFileSync("docs/architecture/TRUST_ALGORITHM_REGISTRY.md", "utf8");
const persistedRuntime = readFileSync("lib/operational-entities/delegated-authority-server.ts", "utf8");
const delegatedRoute = readFileSync("app/api/operational-entities/[entityId]/delegated-authority/route.ts", "utf8");
const transactionServer = readFileSync("lib/trust-transaction/server.ts", "utf8");

test("extensions feed the canonical ALLOW REVIEW DENY transaction instead of creating another engine", () => {
  assert.match(canonical, /capabilityGovernance\?\.decision === "DENY"/);
  assert.match(canonical, /interAgentConflict\?\.decision === "REVIEW"/);
  assert.match(canonical, /capabilityGovernance: capabilityGovernance\?\.snapshot \?\? null/);
  assert.match(canonical, /interAgentAuthorityConflict: interAgentConflict\?\.snapshot \?\? null/);
  assert.doesNotMatch(`${capability}\n${conflict}`, /class\s+.*DecisionEngine|create table|model_registry|agent_registry/i);
});

test("provider type is descriptive and provider reputation is not an authority input", () => {
  assert.match(capability, /openClosedClassification/);
  assert.doesNotMatch(capability, /providerReputation|frontierProviderTrusted|openWeightUnsafe/);
  assert.match(readFileSync("docs/architecture/CAPABILITY_BASED_MODEL_GOVERNANCE.md", "utf8"), /not by whether the AI is open, closed, cloud-hosted or self-hosted/i);
});

test("existing tenant RLS and immutable canonical snapshot eliminate the need for a new table", () => {
  assert.match(entityMigration, /'operational_entities'[\s\S]*alter table public\.%I enable row level security[\s\S]*user_can_access_trust_workspace\(enterprise_id\)/i);
  assert.match(transactionMigration, /'canonical_trust_transactions'[\s\S]*alter table public\.%I enable row level security[\s\S]*user_can_access_trust_workspace\(enterprise_id\)/i);
  assert.match(entityMigration, /canonical_decision_snapshot_immutable/);
  assert.match(entityMigration, /decision_time_snapshot[\s\S]*Immutable exact decision-time context/i);
  const featureMigrations = readdirSync("supabase/migrations").filter((name) => /capability.*governance|inter.*agent.*conflict/i.test(name));
  assert.deepEqual(featureMigrations, []);
});

test("existing Evidence Graph Replay and Trust Memory semantics are reused", () => {
  assert.match(conflict, /ProviderNeutralReplayEvent/);
  assert.match(evidence, /INTER_AGENT_CONFLICT_FIRST_OBSERVED/);
  assert.match(evidence, /CAPABILITY_EVALUATION_EXPIRED/);
  assert.match(canonical, /extendEvidenceGraph/);
  assert.match(canonical, /appendReplay/);
  assert.match(canonical, /emitMaterialTrustMemory/);
});

test("authenticated persistence uses existing evidence, graph, Replay, memory, and canonical transaction stores", () => {
  assert.match(delegatedRoute, /evaluatePersistedInterAgentAction/);
  assert.match(persistedRuntime, /from\("evidence_objects"\)\.insert/);
  assert.match(persistedRuntime, /from\("evidence_graph_nodes"\)/);
  assert.match(persistedRuntime, /from\("evidence_graph_edges"\)/);
  assert.match(persistedRuntime, /appendReplay/);
  assert.match(persistedRuntime, /remember\(context, sourceEntityId, "INTER_AGENT_CONFLICT_FIRST_OBSERVED"/);
  assert.match(persistedRuntime, /evaluateCapabilityGovernance/);
  assert.match(persistedRuntime, /evaluateInterAgentAuthorityConflict/);
  assert.match(persistedRuntime, /evaluateStoredDelegatedAction/);
  assert.match(persistedRuntime, /executeCanonicalTrustTransaction/);
  assert.match(transactionServer, /capability_governance_evidence/);
  assert.match(transactionServer, /inter_agent_relationship_evidence/);
  assert.doesNotMatch(delegatedRoute, /body\.decision|input\.decision|raw\.decision/);
  assert.doesNotMatch(persistedRuntime, /decision:\s*raw\.|decision:\s*String\(raw/);
});

test("Operational Entity UI presents model governance and authority relationships without raw JSON as the primary UX", () => {
  assert.match(page, /OperationalEntityGovernanceSummary/);
  assert.match(governanceSummary, />Model Governance</);
  assert.match(governanceSummary, />Capability evidence</);
  assert.match(governanceSummary, />Authority Relationships</);
  assert.match(governanceSummary, />Agent compatibility</);
  assert.match(governanceSummary, />View evidence</);
  assert.match(governanceSummary, />View authority lineage</);
  assert.match(governanceSummary, />Open Replay</);
  assert.doesNotMatch(governanceSummary, /JSON\.stringify/);
});

test("algorithm registry owns the two deterministic extensions", () => {
  assert.match(registry, /Capability governance \/ `capability-governance-v1`/);
  assert.match(registry, /Inter-agent authority conflict \/ `inter-agent-authority-conflict-v1`/);
});
