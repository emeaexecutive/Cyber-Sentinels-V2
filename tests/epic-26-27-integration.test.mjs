import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { epic2627CrossEpicScenario } from "../src/lib/trust-fabric/cross-epic-scenario.ts";

const read = (path) => fs.readFileSync(path, "utf8");
const sha256CanonicalText = (path) => createHash("sha256").update(read(path).replace(/\r\n/g, "\n"), "utf8").digest("hex");
const epic16Path = "supabase/migrations/202607170002_provider_abstraction_hopae.sql";
const epic17Path = "supabase/migrations/202607200003_provider_consensus_engine.sql";
const graphPath = "supabase/migrations/202607230002_enterprise_trust_graph.sql";
const epic26Path = "supabase/migrations/202607310001_environment_attestation_scope_continuity.sql";
const epic27Path = "supabase/migrations/202608010001_ai_serious_incident_regulatory_lineage.sql";
const fabricPath = "supabase/migrations/202608010002_enterprise_trust_fabric.sql";
const releaseRoot = "supabase/release/epic-26-27";

test("merged Epic 26 and 27 migrations retain their audited hashes", () => {
  assert.equal(sha256CanonicalText(epic26Path), "0f54e55ee0427c396675121f701dcf26bedc56fc20ac5a3a1fb411fd36fe2292");
  assert.equal(sha256CanonicalText(epic27Path), "d4acdf09197be946503938fd31dfe3654fe4495d16f7535e99d263bb0f506385");
});

test("release manifest orders corrected Epic 16, Epic 17, Enterprise graph, Epic 26, Epic 27, and Epic 28", () => {
  const manifest = JSON.parse(read(`${releaseRoot}/manifest.json`));
  assert.deepEqual(manifest.orderedMigrations.map((entry) => entry.path), [epic16Path, epic17Path, graphPath, epic26Path, epic27Path, fabricPath]);
  assert.equal(manifest.reviewOnly, true);
  assert.equal(manifest.remoteMutation, false);
  for (const migration of manifest.orderedMigrations) assert.equal(sha256CanonicalText(migration.path), migration.sha256, migration.path);
  assert.equal(manifest.historicalCorrections.length, 3);
  for (const correction of manifest.historicalCorrections) {
    assert.equal(correction.dataMigrationRequired, false);
    assert.equal(correction.productionLedgerRepairRequired, false);
  }
  const migrationNames = fs.readdirSync("supabase/migrations").filter((name) => /^\d+.*\.sql$/.test(name));
  assert.equal(new Set(migrationNames.map((name) => name.match(/^\d+/)?.[0])).size, migrationNames.length);
  for (const prerequisite of manifest.prerequisites) assert.match(read(`${releaseRoot}/prerequisite-objects.md`), new RegExp(prerequisite.replace(/[()]/g, "\\$&")));
});

test("cross-Epic fixture uses exact tenant-scoped Epic 26 canonical references", () => {
  const scenario = epic2627CrossEpicScenario();
  assert.equal(scenario.canonicalReferences.enterpriseId, scenario.scope.input.declaration.enterpriseId);
  assert.equal(scenario.canonicalReferences.executionContextId, scenario.scope.input.declaration.id);
  assert.equal(scenario.canonicalReferences.scopeAuthorizationLeaseId, scenario.scope.input.authorization.id);
  assert.equal(scenario.canonicalReferences.scopeContinuityDecisionId, scenario.scope.decision.id);
  assert.deepEqual(scenario.canonicalReferences.environmentAttestationIds, scenario.scope.input.attestations.map((item) => item.id));
  assert.equal(scenario.incident.references, scenario.canonicalReferences);
  const fixture = JSON.parse(read(`${releaseRoot}/scenario-fixture.json`));
  assert.equal(fixture.enterpriseId, scenario.canonicalReferences.enterpriseId);
  assert.equal(fixture.executionContextId, scenario.canonicalReferences.executionContextId);
  assert.equal(fixture.scopeAuthorizationLeaseId, scenario.canonicalReferences.scopeAuthorizationLeaseId);
  assert.equal(fixture.incidentId, scenario.incident.id);
  assert.equal(fixture.evidenceSnapshotId, scenario.evidenceSnapshot.id);
  assert.equal(fixture.trustObjectDigest, scenario.trustFabric.trustEvaluation.trustObject.canonicalDigest);
  assert.equal(fixture.decisionEnvelopeDigest, scenario.trustFabric.decisionEnvelope.canonicalDigest);
  assert.equal(fixture.trustContractId, scenario.trustFabric.trustContract.contractId);
  assert.equal(fixture.trustContractOutcome, scenario.trustFabric.trustContractEvaluation.outcome);
  assert.equal(fixture.timelineItemCount, scenario.trustFabric.trustTimeline.length);
  assert.equal(fixture.scenarioDigest, scenario.scenarioDigest);
});

test("cross-Epic scenario is deterministic and digest-bound", () => {
  const first = epic2627CrossEpicScenario();
  const second = epic2627CrossEpicScenario();
  assert.equal(first.scenarioDigest, second.scenarioDigest);
  assert.equal(first.submissionPackage.packageDigest, second.submissionPackage.packageDigest);
  assert.equal(first.evidenceSnapshot.snapshotDigest, second.evidenceSnapshot.snapshotDigest);
  assert.match(first.scenarioDigest, /^[a-f0-9]{64}$/);
  assert.equal(first.trustFabric.trustEvaluation.trustObject.canonicalDigest, second.trustFabric.trustEvaluation.trustObject.canonicalDigest);
  assert.equal(first.trustFabric.decisionEnvelope.canonicalDigest, first.trustFabric.decisionEnvelope.deterministicDigest);
});

test("Trust Fabric composes the active contract, strongest adverse state and one timeline", () => {
  const scenario = epic2627CrossEpicScenario();
  assert.equal(scenario.trustFabric.identity.subject.type, "ai_agent");
  assert.ok(["suspended", "revoked"].includes(scenario.trustFabric.trustEvaluation.currentTrustState));
  assert.equal(scenario.trustFabric.trustEvaluation.trustObject.activeIncidents[0].id, scenario.incident.id);
  assert.equal(scenario.trustFabric.trustContract.revocationState, "active");
  assert.equal(scenario.trustFabric.trustContractEvaluation.outcome, "breached");
  assert.ok(scenario.trustFabric.trustTimeline.some((item) => item.category === "INCIDENT"));
  assert.ok(scenario.trustFabric.trustTimeline.every((item) => item.sourceAuthority && item.replayClassification));
});

test("incident chronology separates occurrence, detection, awareness and containment evidence", () => {
  const { incident } = epic2627CrossEpicScenario();
  assert.notEqual(incident.occurrenceAt, incident.detectionAt);
  assert.notEqual(incident.detectionAt, incident.organizationAwarenessAt);
  assert.equal(incident.containment.state, "provider_acknowledged_not_confirmed");
  assert.equal(incident.containment.confirmedAt, null);
  assert.equal(incident.containment.independentlyConfirmedAt, null);
});

test("operational screening, reviewer authority and legal conclusion stay separate", () => {
  const scenario = epic2627CrossEpicScenario();
  assert.match(scenario.incident.operationalScreening, /specialist_review/);
  assert.equal(scenario.incident.legalConclusion, null);
  assert.equal(scenario.evidenceSnapshot.scopeContinuityDecisionId, scenario.scope.decision.id);
  assert.deepEqual(scenario.evidenceSnapshot.environmentAttestationVersions.map((item) => item.id), scenario.canonicalReferences.environmentAttestationIds);
  assert.ok(scenario.evidenceSnapshot.environmentAttestationVersions.every((item) => /^[a-f0-9]{64}$/.test(item.digest)));
  assert.ok(scenario.evidenceSnapshot.sourceEvidenceVersions.every((item) => /^[a-f0-9]{64}$/.test(item.digest)));
  assert.equal(scenario.reviewerDecision.reviewerRole, "compliance_reviewer");
  assert.match(scenario.reviewerDecision.organizationalAuthority, /^authority:/);
});

test("corrective action and package do not overclaim completion or submission", () => {
  const scenario = epic2627CrossEpicScenario();
  assert.equal(scenario.correctiveAction.state, "in_progress");
  assert.equal(scenario.correctiveAction.effectivenessState, "unknown");
  assert.deepEqual(scenario.correctiveAction.completionEvidenceReferences, []);
  assert.equal(scenario.submissionPackage.state, "internal_draft");
  assert.equal(scenario.replay.some((event) => event.stage === "external_submission"), false);
});

test("Replay and Trust Memory cover both Epics without shadow canonical records", () => {
  const scenario = epic2627CrossEpicScenario();
  assert.ok(scenario.replay.some((event) => "evidenceReference" in event && event.evidenceReference === `decision:${scenario.scope.decision.id}`));
  assert.ok(scenario.replay.some((event) => event.id === scenario.incident.id));
  assert.ok(scenario.trustMemory.some((item) => item.source === "scope_continuity"));
  assert.ok(scenario.trustMemory.some((item) => item.source === "serious_incident"));
  assert.equal(new Set(scenario.replay.map((event) => event.id)).size, scenario.replay.length);
});

test("Epic 27 migration validates cross-Epic references in the same enterprise", () => {
  const sql = read(epic27Path);
  for (const table of ["environment_attestations", "scope_continuity_decisions", "scope_authorization_leases", "execution_context_declarations"]) assert.match(sql, new RegExp(table));
  assert.match(sql, /enterprise_id=enterprise/);
  assert.match(sql, /Tenant-bound Scope Continuity decision reference required/);
});

test("both Epics are RLS-protected, append-only, security-invoker and service-written", () => {
  const sql = `${read(epic26Path)}\n${read(epic27Path)}`;
  assert.ok((sql.match(/enable row level security/g) ?? []).length >= 2);
  assert.match(sql, /foreach table_name in array array\[/);
  assert.match(sql, /scope_continuity_replay with \(security_invoker=true\)/);
  assert.match(sql, /incident_reporting_replay with \(security_invoker=true\)/);
  assert.match(sql, /prevent_scope_continuity_history_mutation/);
  assert.match(sql, /prevent_serious_incident_history_mutation/);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all privileges).* to authenticated/i);
});

test("policy reconciliation handles absent, identical, intentional replacement, conflict and repeat", () => {
  const sql = read(fabricPath);
  for (const state of ["CREATED", "UNCHANGED", "REPLACED", "CONFLICT"]) assert.match(sql, new RegExp(`'${state}'`));
  assert.match(sql, /intentional_replace/);
  assert.match(sql, /p_replacement_reason/);
  assert.match(sql, /migration_policy_decisions/);
  assert.match(sql, /Conflicting policy definition/);
  assert.match(sql, /migration_policy_decisions_append_only/);
});

test("staging package includes the exact review inventory, hashes and forward plan", () => {
  for (const file of ["README.md", "manifest.json", "migration-order.txt", "prerequisite-objects.md", "preflight.sql", "post-apply-validation.sql", "rls-validation.sql", "integrity-validation.sql", "expected-inventory.json", "rollback-limitations.md", "forward-repair-plan.md", "SHA256SUMS"]) assert.equal(fs.existsSync(`${releaseRoot}/${file}`), true, file);
  assert.match(read(`${releaseRoot}/README.md`), /corrected Epic 16 provider abstraction/i);
  assert.match(read(`${releaseRoot}/preflight.sql`), /provider_operational_health_snapshots/);
  assert.match(read(`${releaseRoot}/preflight.sql`), /provider_health_snapshots/);
  const checksums = read(`${releaseRoot}/SHA256SUMS`).trim().split(/\r?\n/);
  for (const line of checksums) {
    const [expected, file] = line.split(/\s{2}/);
    assert.equal(sha256CanonicalText(`${releaseRoot}/${file}`), expected, file);
  }
  const inventory = JSON.parse(read(`${releaseRoot}/expected-inventory.json`));
  const source = `${read(epic26Path)}\n${read(epic27Path)}`;
  for (const name of [...inventory.epic26.tables, ...inventory.epic27.tables, ...inventory.epic26.indexes, ...inventory.epic27.indexes]) assert.match(source, new RegExp(name));
  const providerSource = `${read(epic16Path)}\n${read(epic17Path)}`;
  for (const name of [...inventory.providerHealthReconciliation.tables, ...inventory.providerHealthReconciliation.indexes]) assert.match(providerSource, new RegExp(name));
  const relationshipSource = `${read("supabase/migrations/202606080001_trust_relationships.sql")}\n${read(graphPath)}`;
  for (const name of [...inventory.trustRelationshipsReconciliation.tables, ...inventory.trustRelationshipsReconciliation.indexes]) assert.match(relationshipSource, new RegExp(name));
});

test("canonical demo asks fourteen questions and uses the cross-Epic fixture", () => {
  const demo = read("app/demo/page.tsx");
  const questions = ["Who or what acted?", "What identity was verified?", "What authority existed?", "What environment was declared?", "What environment was observed?", "What scope was permitted?", "What evidence supported the decision?", "Why did trust change?", "Was an incident opened?", "What containment was requested?", "What containment was confirmed?", "Who reviewed it?", "What corrective action followed?", "How can the complete sequence be replayed?"];
  for (const question of questions) assert.ok(demo.includes(question), question);
  assert.match(demo, /epic2627CrossEpicScenario/);
});

test("canonical navigation exposes governance, environment, incidents, readiness, Replay and fabric", () => {
  const navigation = read("lib/navigation/canonical-navigation.ts");
  for (const key of ["governance", "environmentScope", "seriousIncidents", "regulatoryReadiness", "replay", "trustFabric"]) assert.match(navigation, new RegExp(`${key}:`));
});

test("the Epic 26/27 integration command is part of the default CI test chain", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.match(packageJson.scripts["test:epic-26-27-integration"], /epic-26-27-integration/);
  assert.match(packageJson.scripts.test, /test:epic-26-27-integration/);
  assert.match(read(".github/workflows/production-verify.yml"), /npm test/);
});
