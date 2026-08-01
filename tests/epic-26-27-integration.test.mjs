import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import { epic2627CrossEpicScenario } from "../src/lib/trust-fabric/cross-epic-scenario.ts";

const read = (path) => fs.readFileSync(path, "utf8");
const sha256 = (path) => createHash("sha256").update(fs.readFileSync(path)).digest("hex");
const epic26Path = "supabase/migrations/202607310001_environment_attestation_scope_continuity.sql";
const epic27Path = "supabase/migrations/202608010001_ai_serious_incident_regulatory_lineage.sql";
const fabricPath = "supabase/migrations/202608010002_enterprise_trust_fabric.sql";
const releaseRoot = "supabase/release/epic-26-27";

test("merged Epic 26 and 27 migrations retain their audited hashes", () => {
  assert.equal(sha256(epic26Path), "fdfa8d25f3280eef27835d6d7ed62fd5a387c59d0195c57d2329eea1c3c53f3d");
  assert.equal(sha256(epic27Path), "7831be488d85281673ecfd29500029fbad32d3b8759c6e51bba4384788d028e2");
});

test("release manifest orders Epic 26 before Epic 27 and pins canonical files", () => {
  const manifest = JSON.parse(read(`${releaseRoot}/manifest.json`));
  assert.deepEqual(manifest.orderedMigrations.slice(0, 2).map((entry) => entry.path), [epic26Path, epic27Path]);
  assert.equal(manifest.reviewOnly, true);
  assert.equal(manifest.remoteMutation, false);
  const migrationNames = fs.readdirSync("supabase/migrations").filter((name) => /^\d+.*\.sql$/.test(name));
  assert.equal(new Set(migrationNames.map((name) => name.match(/^\d+/)?.[0])).size, migrationNames.length);
  for (const prerequisite of manifest.prerequisites) assert.match(read(`${releaseRoot}/prerequisite-objects.txt`), new RegExp(prerequisite.replace(/[()]/g, "\\$&")));
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
});

test("cross-Epic scenario is deterministic and digest-bound", () => {
  const first = epic2627CrossEpicScenario();
  const second = epic2627CrossEpicScenario();
  assert.equal(first.scenarioDigest, second.scenarioDigest);
  assert.equal(first.submissionPackage.packageDigest, second.submissionPackage.packageDigest);
  assert.equal(first.evidenceSnapshot.snapshotDigest, second.evidenceSnapshot.snapshotDigest);
  assert.match(first.scenarioDigest, /^[a-f0-9]{64}$/);
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

test("staging package includes preflight, post-apply, RLS, integrity, inventory, hashes and forward plan", () => {
  for (const file of ["README.md", "manifest.json", "ordered-migrations.txt", "prerequisite-objects.txt", "preflight.sql", "post-apply-validation.sql", "rls-validation.sql", "integrity-validation.sql", "object-inventory.json", "scenario-fixture.json", "checksums.sha256"]) assert.equal(fs.existsSync(`${releaseRoot}/${file}`), true, file);
  assert.match(read(`${releaseRoot}/README.md`), /forward-only migration/i);
  assert.match(read(`${releaseRoot}/preflight.sql`), /provider_health_snapshots/);
  const checksums = read(`${releaseRoot}/checksums.sha256`).trim().split(/\r?\n/);
  for (const line of checksums) {
    const [expected, file] = line.split(/\s{2}/);
    assert.equal(sha256(`${releaseRoot}/${file}`), expected, file);
  }
  const inventory = JSON.parse(read(`${releaseRoot}/object-inventory.json`));
  const source = `${read(epic26Path)}\n${read(epic27Path)}`;
  for (const name of [...inventory.epic26.tables, ...inventory.epic27.tables, ...inventory.epic26.indexes, ...inventory.epic27.indexes]) assert.match(source, new RegExp(name));
});

test("canonical demo asks twelve questions and uses the cross-Epic fixture", () => {
  const demo = read("app/demo/page.tsx");
  const questions = ["Who or what acted?", "What authority existed?", "What environment was declared?", "What environment was observed?", "What scope was permitted?", "What evidence supported the decision?", "Why did trust change?", "Was an incident opened?", "What containment occurred?", "Who reviewed it?", "What corrective action followed?", "How is the complete sequence replayed?"];
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
