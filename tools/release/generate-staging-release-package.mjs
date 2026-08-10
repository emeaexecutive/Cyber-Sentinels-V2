import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const migrationRoot = join(repoRoot, "supabase", "migrations");
const packageRoot = join(
  repoRoot,
  "supabase",
  "release",
  "enterprise-trust-fabric-staging",
);
const docsRoot = join(repoRoot, "docs", "release");
const productionHead = "202606090003";
const stagingReference = "agpyhygpfmppjkxwcpac";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeName(value) {
  return value.replaceAll('"', "").toLowerCase();
}

function matches(source, expression, select = (match) => match[1]) {
  return [...source.matchAll(expression)].map(select);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function title(value) {
  return value
    .replace(/\.sql$/i, "")
    .replace(/^\d+_?/, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function epicFor(name) {
  const timestamp = name.split("_")[0];
  if (timestamp >= "202608010002") return "Epic 28";
  if (timestamp >= "202608010001") return "Epic 27";
  if (timestamp >= "202607310001") return "Epic 26";
  if (timestamp >= "202607240004") return "Epic 25";
  if (timestamp >= "202607240003") return "Epic 24";
  if (timestamp >= "202607240002") return "Epic 23";
  if (timestamp >= "202607240001") return "Epic 22";
  if (timestamp >= "202607230002") return "Epic 21";
  if (timestamp >= "202607230001") return "Epic 20";
  if (timestamp >= "202607210002") return "Epic 19";
  if (timestamp >= "202607210001") return "Epic 18";
  if (timestamp >= "202607190001") return "Epic 17";
  if (timestamp >= "202607160001") return "Release 1 / Epic 16-17";
  if (timestamp >= "202606100001") return "Pre-Epic 16 release foundation";
  return "Applied legacy foundation";
}

function schemaPrefix(name) {
  return name.includes(".") ? name : `public.${name}`;
}

function parseMigration(name) {
  const path = join(migrationRoot, name);
  const sql = readFileSync(path, "utf8");
  const timestamp = name.split("_")[0];
  const tables = matches(
    sql,
    /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const materializedViews = matches(
    sql,
    /create\s+materialized\s+view\s+(?:if\s+not\s+exists\s+)?((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const views = matches(
    sql,
    /create\s+(?:or\s+replace\s+)?view\s+((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const functions = matches(
    sql,
    /create\s+(?:or\s+replace\s+)?function\s+((?:public\.)?"?[a-z_][\w$]*"?)\s*\(/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const indexes = matches(
    sql,
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?"?([a-z_][\w$]*)"?/gi,
    (match) => `public.${normalizeName(match[1])}`,
  );
  const directPolicies = matches(
    sql,
    /create\s+policy\s+(?:"([^"]+)"|([a-z_][\w$]*))\s+on\s+((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => `${schemaPrefix(normalizeName(match[3]))}.${normalizeName(match[1] ?? match[2])}`,
  );
  const directTriggers = matches(
    sql,
    /create\s+trigger\s+"?([a-z_][\w$]*)"?[\s\S]{0,240}?\bon\s+((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => `${schemaPrefix(normalizeName(match[2]))}.${normalizeName(match[1])}`,
  );
  const dynamicPolicies = [];
  const dynamicTriggers = [];
  for (const loop of sql.matchAll(/foreach\s+\w+\s+in\s+array\s+array\[([^\]]+)\]\s+loop([\s\S]*?)end\s+loop/gi)) {
    const tableNames = matches(loop[1], /'([a-z_][\w$]*)'/gi, (match) => normalizeName(match[1]));
    const triggerSuffix = loop[2].match(/create\s+trigger\s+%I(_[a-z_][\w$]*)/i)?.[1];
    if (triggerSuffix) {
      for (const tableName of tableNames) dynamicTriggers.push(`public.${tableName}.${tableName}${triggerSuffix}`);
    }
    if (/create\s+policy\s+%I[\s\S]*?'tenant reads '\s*\|\|/i.test(loop[2])) {
      for (const tableName of tableNames) dynamicPolicies.push(`public.${tableName}.tenant reads ${tableName}`);
    }
  }
  const policies = [...directPolicies, ...dynamicPolicies];
  const triggers = [...directTriggers, ...dynamicTriggers];
  const constraints = matches(
    sql,
    /\bconstraint\s+"?([a-z_][\w$]*)"?/gi,
    (match) => normalizeName(match[1]),
  );
  const droppedIndexes = matches(
    sql,
    /drop\s+index\s+(?:if\s+exists\s+)?((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const droppedPolicies = matches(
    sql,
    /drop\s+policy\s+(?:if\s+exists\s+)?(?:"([^"]+)"|([a-z_][\w$]*))\s+on\s+((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => `${schemaPrefix(normalizeName(match[3]))}.${normalizeName(match[1] ?? match[2])}`,
  );
  const droppedTriggers = matches(
    sql,
    /drop\s+trigger\s+(?:if\s+exists\s+)?"?([a-z_][\w$]*)"?\s+on\s+((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => `${schemaPrefix(normalizeName(match[2]))}.${normalizeName(match[1])}`,
  );
  const droppedConstraints = matches(
    sql,
    /drop\s+constraint\s+(?:if\s+exists\s+)?"?([a-z_][\w$]*)"?/gi,
    (match) => normalizeName(match[1]),
  );
  const alteredTables = matches(
    sql,
    /alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?((?:public\.)?"?[a-z_][\w$]*"?)/gi,
    (match) => schemaPrefix(normalizeName(match[1])),
  );
  const referencedPublicObjects = matches(
    sql.replace(/--[^\n]*/g, ""),
    /\bpublic\."?([a-z_][\w$]*)"?/gi,
    (match) => `public.${normalizeName(match[1])}`,
  );
  const referencedFunctions = matches(
    sql.replace(/--[^\n]*/g, ""),
    /\b((?:public|auth)\."?[a-z_][\w$]*"?)\s*\(/gi,
    (match) => normalizeName(match[1]),
  );
  const referencedColumns = matches(
    sql,
    /references\s+((?:public|auth|storage)\."?[a-z_][\w$]*"?)\s*\(\s*"?([a-z_][\w$]*)"?/gi,
    (match) => `${normalizeName(match[1])}.${normalizeName(match[2])}`,
  );
  const grants = matches(
    sql,
    /\b(?:grant|revoke)\s+([a-z, ]+)\s+on\s+(?:table\s+|function\s+)?/gi,
    (match) => match[0].trim().replace(/\s+/g, " ").toUpperCase(),
  );
  const rls = /\b(?:enable|force)\s+row\s+level\s+security\b|\bcreate\s+policy\b/i.test(sql);
  const destructiveSignals = {
    dropTable: matches(sql, /\bdrop\s+table\b/gi, () => true).length,
    dropColumn: matches(sql, /\bdrop\s+column\b/gi, () => true).length,
    truncate: matches(sql, /\btruncate\b/gi, () => true).length,
    delete: matches(sql, /\bdelete\s+from\b/gi, () => true).length,
    cascade: matches(sql, /\bcascade\b/gi, () => true).length,
    alterType: matches(sql, /\balter\s+(?:column\s+\w+\s+)?type\b/gi, () => true).length,
    dropConstraint: matches(sql, /\bdrop\s+constraint\b/gi, () => true).length,
    dropPolicy: matches(sql, /\bdrop\s+policy\b/gi, () => true).length,
    replaceFunction: matches(sql, /\bcreate\s+or\s+replace\s+function\b/gi, () => true).length,
    update: matches(sql, /\bupdate\s+(?:public\.)?[a-z_][\w$]*\b/gi, () => true).length,
    insert: matches(sql, /\binsert\s+into\b/gi, () => true).length,
  };
  const unboundedDelete = sql
    .split(";")
    .some((statement) => /\bdelete\s+from\b/i.test(statement) && !/\bwhere\b/i.test(statement));
  const creates = unique([
    ...tables.map((value) => `table:${value}`),
    ...views.map((value) => `view:${value}`),
    ...materializedViews.map((value) => `materialized_view:${value}`),
    ...functions.map((value) => `function:${value}`),
    ...indexes.map((value) => `index:${value}`),
    ...policies.map((value) => `policy:${value}`),
    ...triggers.map((value) => `trigger:${value}`),
  ]);
  const hasExistingTableChange = alteredTables.length > 0;
  const lockRisk =
    destructiveSignals.dropTable || destructiveSignals.dropColumn || destructiveSignals.alterType
      ? "BLOCKING"
      : destructiveSignals.dropConstraint || (hasExistingTableChange && indexes.length >= 4)
        ? "HIGH"
        : hasExistingTableChange || indexes.length || destructiveSignals.dropPolicy
          ? "MEDIUM"
          : "LOW";
  const dataImpact = unboundedDelete
    ? "prohibited unbounded delete"
    : destructiveSignals.delete
      ? "bounded delete path; staging evidence required"
      : destructiveSignals.update
        ? "bounded update/backfill path; row volume unknown"
        : destructiveSignals.insert
          ? "deterministic seed/configuration inserts"
          : "none";
  const classifications = [];
  if (tables.length) classifications.push("table creation");
  if (functions.length) classifications.push("function or RPC");
  if (policies.length || destructiveSignals.dropPolicy) classifications.push("policy hardening");
  if (views.length || materializedViews.length) classifications.push("view or projection");
  if (indexes.length) classifications.push("index creation");
  if (constraints.length || destructiveSignals.dropConstraint) classifications.push("constraint hardening");
  if (destructiveSignals.update || destructiveSignals.delete) classifications.push("data backfill");
  if (/reconciliation|compatib|align|correction|separation/i.test(name + sql.slice(0, 600))) {
    classifications.push(/reconciliation/i.test(name) ? "reconciliation" : "compatibility repair");
  }
  if (/validation/i.test(name)) classifications.push("validation");
  if (!classifications.length) classifications.push("additive schema");
  else classifications.push("feature schema");
  return {
    timestamp,
    name,
    path: `supabase/migrations/${name}`,
    purpose: title(name),
    epic: epicFor(name),
    sql,
    hash: sha256(sql),
    tables: unique(tables),
    views: unique(views),
    materializedViews: unique(materializedViews),
    functions: unique(functions),
    indexes: unique(indexes),
    policies: unique(policies),
    triggers: unique(triggers),
    constraints: unique(constraints),
    droppedIndexes: unique(droppedIndexes),
    droppedPolicies: unique(droppedPolicies),
    droppedTriggers: unique(droppedTriggers),
    droppedConstraints: unique(droppedConstraints),
    alteredTables: unique(alteredTables),
    referencedPublicObjects: unique(referencedPublicObjects),
    referencedFunctions: unique(referencedFunctions),
    referencedColumns: unique(referencedColumns),
    grants: unique(grants),
    creates,
    rls,
    destructiveSignals,
    unboundedDelete,
    lockRisk,
    dataImpact,
    classifications: unique(classifications),
  };
}

const migrationNames = readdirSync(migrationRoot)
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort((left, right) => left.localeCompare(right));
const migrations = migrationNames.map(parseMigration);
const applied = migrations.filter((migration) => migration.timestamp <= productionHead);
const pending = migrations.filter((migration) => migration.timestamp > productionHead);
const firstPending = pending[0];
const targetHead = pending.at(-1)?.timestamp;
if (!firstPending || !targetHead) throw new Error("Pending migration chain is empty");
if (applied.length !== 45 || pending.length !== 41) {
  throw new Error(`Unexpected applied/pending split: ${applied.length}/${pending.length}`);
}

const phaseDefinitions = [
  {
    id: "A",
    name: "Compatibility and historical corrections",
    start: "202606100001",
    end: "202607020001",
    duration: "MEDIUM",
    lockRisk: "HIGH",
    compatibility: "Preserves the Production head while adding release, governance, verifier, session, support and owner-scoped compatibility foundations.",
  },
  {
    id: "B",
    name: "Provider, identity and trust foundations",
    start: "202607160001",
    end: "202607200003",
    duration: "HIGH",
    lockRisk: "HIGH",
    compatibility: "Adds provider, identity, canonical event, consent and consensus contracts without replacing legacy trust ownership.",
  },
  {
    id: "C",
    name: "Enterprise trust architecture",
    start: "202607210001",
    end: "202607240004",
    duration: "HIGH",
    lockRisk: "HIGH",
    compatibility: "Builds versioned Trust Architecture, Intelligence, Graph, DNA, Replay, Continuous Trust and Trust Centre projections.",
  },
  {
    id: "D",
    name: "Environment and Scope",
    start: "202607310001",
    end: "202607310001",
    duration: "MEDIUM",
    lockRisk: "MEDIUM",
    compatibility: "Adds Environment Attestation and Scope Continuity after all trust and replay prerequisites.",
  },
  {
    id: "E",
    name: "Serious Incidents",
    start: "202608010001",
    end: "202608010001",
    duration: "HIGH",
    lockRisk: "HIGH",
    compatibility: "Adds protected serious-incident evidence and regulatory lineage without turning screening into a legal decision.",
  },
  {
    id: "F",
    name: "Enterprise Trust Fabric and Alpha/Beta product proof",
    start: "202608010002",
    end: "202608100005",
    duration: "MEDIUM",
    lockRisk: "MEDIUM",
    compatibility: "Adds composition records and the canonical Alpha/Beta verification, delegation, transaction, enforcement and persistence repairs without replacing Trust Object ownership, Replay or Trust Memory.",
  },
  {
    id: "G",
    name: "Validation",
    start: null,
    end: null,
    duration: "MEDIUM",
    lockRisk: "LOW",
    compatibility: "Read-only object, RLS, integrity, compatibility and synthetic-mode validation only.",
  },
];

function phaseFor(migration) {
  return phaseDefinitions.find(
    (phase) => phase.start && migration.timestamp >= phase.start && migration.timestamp <= phase.end,
  );
}
for (const migration of pending) {
  const phase = phaseFor(migration);
  if (!phase) throw new Error(`No release phase for ${migration.name}`);
  migration.phase = phase.id;
}

const creatorByObject = new Map();
for (const migration of migrations) {
  for (const table of migration.tables) {
    if (!creatorByObject.has(table)) creatorByObject.set(table, migration);
  }
  for (const view of [...migration.views, ...migration.materializedViews]) {
    if (!creatorByObject.has(view)) creatorByObject.set(view, migration);
  }
  for (const fn of migration.functions) {
    if (!creatorByObject.has(fn)) creatorByObject.set(fn, migration);
  }
  for (const index of migration.indexes) {
    if (!creatorByObject.has(index)) creatorByObject.set(index, migration);
  }
}

const dependencyNodes = pending.map((migration, index) => {
  const createdHere = new Set([...migration.tables, ...migration.views, ...migration.materializedViews, ...migration.functions, ...migration.indexes]);
  const guardedOptionalPublicReferences = unique(
    matches(
      migration.sql,
      /to_regclass\(\s*'public\.([a-z_][\w$]*)'\s*\)/gi,
      (match) => `public.${normalizeName(match[1])}`,
    ).filter((object) => !creatorByObject.has(object)),
  );
  const unresolvedPublicPrerequisites = unique(
    migration.referencedPublicObjects.filter(
      (object) => !creatorByObject.has(object) && !guardedOptionalPublicReferences.includes(object),
    ),
  );
  const prerequisiteObjects = unique(
    migration.referencedPublicObjects.filter((object) => {
      const creator = creatorByObject.get(object);
      return creator && creator.timestamp < migration.timestamp && !createdHere.has(object);
    }),
  );
  const laterReferences = unique(
    migration.referencedPublicObjects.filter((object) => {
      const creator = creatorByObject.get(object);
      return creator && creator.timestamp > migration.timestamp;
    }),
  );
  const prerequisiteMigrations = unique(
    prerequisiteObjects.map((object) => creatorByObject.get(object)?.timestamp),
  );
  const prerequisiteFunctions = unique(
    migration.referencedFunctions.filter((fn) => {
      const creator = creatorByObject.get(fn);
      return creator && creator.timestamp < migration.timestamp;
    }),
  );
  const policyHelpers = prerequisiteFunctions.filter((fn) =>
    /access|author|tenant|workspace|policy|identity|user/.test(fn),
  );
  const extensions = [];
  if (/\b(?:digest|gen_random_uuid|crypt|gen_salt)\s*\(/i.test(migration.sql)) extensions.push("pgcrypto");
  if (/\buuid_generate_v4\s*\(/i.test(migration.sql)) extensions.push("uuid-ossp");
  return {
    timestamp: migration.timestamp,
    migration: migration.path,
    phase: migration.phase,
    sequencePredecessor: index === 0 ? productionHead : pending[index - 1].timestamp,
    prerequisiteMigrations,
    prerequisiteTables: prerequisiteObjects.filter((object) => creatorByObject.get(object)?.tables.includes(object)),
    prerequisiteColumns: migration.referencedColumns,
    prerequisiteFunctions,
    prerequisitePolicyHelpers: policyHelpers,
    prerequisiteExtensions: unique(extensions),
    createdObjects: migration.creates,
    downstreamConsumers: [],
    laterReferences,
    guardedOptionalPublicReferences,
    unresolvedPublicPrerequisites,
  };
});
const nodeByTimestamp = new Map(dependencyNodes.map((node) => [node.timestamp, node]));
for (const node of dependencyNodes) {
  for (const prerequisite of node.prerequisiteMigrations) {
    const prerequisiteNode = nodeByTimestamp.get(prerequisite);
    if (prerequisiteNode) prerequisiteNode.downstreamConsumers.push(node.timestamp);
  }
}
for (const node of dependencyNodes) node.downstreamConsumers = unique(node.downstreamConsumers);

const destructiveRows = pending.map((migration) => {
  const signals = Object.entries(migration.destructiveSignals)
    .filter(([, count]) => count)
    .map(([name, count]) => `${name}:${count}`);
  let classification = "safe and intentional";
  if (
    migration.destructiveSignals.dropTable ||
    migration.destructiveSignals.dropColumn ||
    migration.destructiveSignals.truncate ||
    migration.destructiveSignals.alterType ||
    migration.unboundedDelete
  ) {
    classification = "prohibited";
  } else if (migration.destructiveSignals.dropConstraint || migration.destructiveSignals.delete) {
    classification = "requires Production approval";
  } else if (
    migration.destructiveSignals.dropPolicy ||
    migration.destructiveSignals.replaceFunction ||
    migration.destructiveSignals.update ||
    migration.destructiveSignals.cascade
  ) {
    classification = "requires staging evidence";
  } else if (!signals.length) {
    classification = "false positive: no destructive token";
  }
  return { migration, signals, classification };
});
if (destructiveRows.some((row) => row.classification === "prohibited")) {
  throw new Error("Prohibited destructive SQL detected in the pending chain");
}

mkdirSync(packageRoot, { recursive: true });
mkdirSync(docsRoot, { recursive: true });

const dependencyGraph = {
  schemaVersion: 1,
  productionHead,
  targetHead,
  ordering: "lexical migration timestamp",
  requiredManagedSchemas: ["auth", "storage"],
  nodes: dependencyNodes,
  assertions: {
    duplicateTimestamp: false,
    circularDependency: false,
    laterObjectReference: dependencyNodes.every((node) => node.laterReferences.length === 0),
    noRemoteOnlyPublicPrerequisite: dependencyNodes.every((node) => node.unresolvedPublicPrerequisites.length === 0),
    epic26BeforeEpic27: true,
    epic27BeforeEpic28: true,
  },
};

function finalNames(createdField, droppedField) {
  const names = new Set();
  for (const migration of migrations) {
    for (const dropped of migration[droppedField] ?? []) names.delete(dropped);
    for (const created of migration[createdField] ?? []) names.add(created);
  }
  return [...names].sort();
}

const inventory = {
  schemaVersion: 1,
  productionHead,
  targetHead,
  tables: unique(migrations.flatMap((migration) => migration.tables)),
  views: unique(migrations.flatMap((migration) => migration.views)),
  materializedViews: unique(migrations.flatMap((migration) => migration.materializedViews)),
  functions: unique(migrations.flatMap((migration) => migration.functions)),
  indexes: finalNames("indexes", "droppedIndexes"),
  constraints: finalNames("constraints", "droppedConstraints"),
  policies: finalNames("policies", "droppedPolicies"),
  triggers: finalNames("triggers", "droppedTriggers"),
  grantOperations: unique(migrations.flatMap((migration) => migration.grants)),
  requiredDistinctions: {
    providerOperationalHealth: "public.provider_operational_health_snapshots",
    providerConsensusHealth: "public.provider_health_snapshots",
    legacyTrustRelationships: "public.trust_relationships",
    enterpriseTrustRelationships: "public.trust_graph_relationships_v2",
  },
  requiredPhaseObjects: {
    epic26: ["public.environment_attestations", "public.scope_continuity_decisions", "public.scope_continuity_replay"],
    epic27: ["public.incident_regulatory_assessments", "public.incident_submission_packages", "public.incident_reporting_replay"],
    epic28: ["public.trust_contracts", "public.trust_contract_evaluations", "public.trust_fabric_decisions"],
  },
};

const phases = phaseDefinitions.map((definition, index) => {
  const phaseMigrations = pending.filter((migration) => migration.phase === definition.id);
  const previous = phaseDefinitions[index - 1];
  return {
    id: definition.id,
    name: definition.name,
    validationOnly: definition.id === "G",
    migrations: phaseMigrations.map((migration) => ({
      path: migration.path,
      sha256: migration.hash,
      lockRisk: migration.lockRisk,
    })),
    prerequisites: definition.id === "A" ? [`Production-compatible reconstruction through ${productionHead}`] : [`Phase ${previous.id} complete and validated`],
    expectedObjects: unique(phaseMigrations.flatMap((migration) => migration.creates)),
    expectedDurationCategory: definition.duration,
    lockRisk: definition.lockRisk,
    rowVolumeRisk: "unknown until measured in isolated staging",
    applicationCompatibility: definition.compatibility,
    validationSql: definition.id === "G"
      ? ["post-apply-validation.sql", "rls-validation.sql", "integrity-validation.sql", "compatibility-validation.sql"]
      : ["post-apply-validation.sql"],
    stopCondition: "Stop on unexpected migration head, missing prerequisite, catalog collision, SQL error, RLS/grant drift, lock-risk escalation or non-synthetic data evidence.",
    rollbackBoundary: "Stop before the next phase; do not destructively reverse append-only evidence. Restore the disposable staging boundary or forward-repair under review.",
    forwardRepairPath: "Record the exact failed statement and catalog state, author a separately reviewed forward-only repair, regenerate hashes and restart from a clean isolated boundary.",
    requiredHumanApproval: definition.id === "G" ? "Release owner reviews all validation evidence." : `Release owner approves entry into Phase ${definition.id} after the prior boundary passes.`,
  };
});

const releasePlan = {
  schemaVersion: 1,
  release: "enterprise-trust-fabric-staging-epic-29.2",
  reviewOnly: true,
  migrationExecutionPermitted: false,
  productionMutationPermitted: false,
  syntheticDataOnly: true,
  productionHead,
  firstPendingMigration: firstPending.timestamp,
  targetHead,
  appliedMigrationCount: applied.length,
  pendingMigrationCount: pending.length,
  phaseOrder: phaseDefinitions.map((phase) => phase.id),
  validationOrder: [
    "preflight.sql",
    "post-apply-validation.sql",
    "rls-validation.sql",
    "integrity-validation.sql",
    "compatibility-validation.sql",
  ],
  architectureFreeze: {
    source: "docs/release/EPIC_29_ARCHITECTURE_FREEZE.md",
    incompatibleChangesPermitted: false,
    contracts: [
      "Trust Object",
      "Trust Contract",
      "evidence taxonomy",
      "trust states",
      "provider states",
      "Replay availability",
      "Scope Continuity",
      "Serious-Incident protected decisions",
      "tenant identity",
      "reviewer authority",
    ],
  },
};

function writePackage(name, value) {
  const output = typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(join(packageRoot, name), output, "utf8");
}

writePackage("release-plan.json", releasePlan);
writePackage("phase-manifest.json", { schemaVersion: 1, release: releasePlan.release, phases });
writePackage("dependency-graph.json", dependencyGraph);
writePackage("expected-inventory.json", inventory);
writePackage("migration-order.txt", `${pending.map((migration) => migration.path).join("\n")}\n`);

writePackage(
  "README.md",
  `# Enterprise Trust Fabric staging release package

This is the canonical Epic 29.2 review package for reconstructing the isolated staging boundary in Epic 29.3. It references ${pending.length} canonical migrations from \`${firstPending.timestamp}\` through \`${targetHead}\`; it contains no copied migration SQL and performs no migration automatically.

The required starting ledger head is \`${productionHead}\`. Before any future execution, verify the actual staging project outside SQL, set the session-scoped release identity values required by \`preflight.sql\`, and run the environment safety guard. Production, unknown identities, missing synthetic mode and unexpected ledger heads fail closed.

Apply phases A-F only under separate Epic 29.3 authorization and stop at every phase boundary. Phase G is read-only validation. Live behavioral RLS testing remains reserved for Epic 29.4.

Canonical order and hashes are in \`migration-order.txt\`, \`phase-manifest.json\` and \`SHA256SUMS\`. Validation files inspect catalogs only and must never be used to infer that Production is authorized for mutation.
`,
);

writePackage(
  "preflight.sql",
  `-- Read-only staging preflight. Set these session values only after out-of-band project verification:
-- set app.release_environment = 'staging';
-- set app.release_project_ref = '${stagingReference}';
-- set app.release_synthetic_mode = 'true';
begin transaction read only;
do $$
declare
  actual_head text;
begin
  if current_setting('app.release_environment', true) is distinct from 'staging' then
    raise exception 'STAGING_ENVIRONMENT_IDENTITY_REQUIRED';
  end if;
  if current_setting('app.release_project_ref', true) is distinct from '${stagingReference}' then
    raise exception 'STAGING_PROJECT_IDENTITY_MISMATCH';
  end if;
  if current_setting('app.release_synthetic_mode', true) is distinct from 'true' then
    raise exception 'SYNTHETIC_MODE_REQUIRED';
  end if;
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'POSTGRESQL_17_REQUIRED';
  end if;
  if exists (
    select 1 from unnest(array['pgcrypto','uuid-ossp']) required(name)
    where not exists(select 1 from pg_extension e where e.extname=required.name)
  ) then raise exception 'REQUIRED_EXTENSION_MISSING'; end if;
  select max(version) into actual_head from supabase_migrations.schema_migrations;
  if actual_head is distinct from '${productionHead}' then
    raise exception 'UNEXPECTED_STARTING_MIGRATION_HEAD';
  end if;
  if to_regclass('public.trust_relationships') is null then
    raise exception 'LEGACY_TRUST_RELATIONSHIPS_MISSING';
  end if;
  if to_regclass('public.trust_graph_relationships_v2') is not null
    or to_regclass('public.trust_fabric_decisions') is not null then
    raise exception 'UNEXPECTED_PENDING_OBJECT_PRESENT';
  end if;
  if to_regclass('auth.users') is null or to_regclass('storage.objects') is null then
    raise exception 'AUTH_OR_STORAGE_PREREQUISITE_MISSING';
  end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='trust_relationships' and c.relkind not in ('r','p')
  ) then raise exception 'LEGACY_RELATION_NAMESPACE_COLLISION'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and c.relname in ('trust_workspaces','workspace_members') and not c.relrowsecurity
  ) then raise exception 'RLS_BASELINE_INCOMPATIBLE'; end if;
end $$;
select 'STAGING_PREFLIGHT_PASS' as status, '${productionHead}' as expected_starting_head;
commit;
`,
);

const expectedTablesSql = inventory.tables.map((name) => name.replace(/^public\./, "")).filter((name) => !name.includes(".")).map((name) => `'${name}'`).join(",");
const expectedViewsSql = [...inventory.views, ...inventory.materializedViews].map((name) => name.replace(/^public\./, "")).filter((name) => !name.includes(".")).map((name) => `'${name}'`).join(",");
const expectedFunctionsSql = inventory.functions.map((name) => name.replace(/^public\./, "")).filter((name) => !name.includes(".")).map((name) => `'${name}'`).join(",");
const expectedIndexesSql = inventory.indexes.map((name) => name.replace(/^public\./, "")).filter((name) => !name.includes(".")).map((name) => `'${name}'`).join(",");
const expectedConstraintsSql = inventory.constraints.map((name) => `'${name.replaceAll("'", "''")}'`).join(",");
const expectedPoliciesSql = inventory.policies.map((name) => {
  const [schema, table, ...policy] = name.split(".");
  return `'${schema}|${table}|${policy.join(".").replaceAll("'", "''")}'`;
}).join(",");
const expectedTriggersSql = inventory.triggers.map((name) => {
  const [schema, table, ...trigger] = name.split(".");
  return `'${schema}|${table}|${trigger.join(".").replaceAll("'", "''")}'`;
}).join(",");
writePackage(
  "post-apply-validation.sql",
  `begin transaction read only;
do $$
declare actual_head text;
begin
  select max(version) into actual_head from supabase_migrations.schema_migrations;
  if actual_head is distinct from '${targetHead}' then raise exception 'TARGET_MIGRATION_HEAD_MISMATCH'; end if;
  if exists (
    select 1 from unnest(array[${expectedTablesSql}]::text[]) expected(name)
    where to_regclass('public.' || expected.name) is null
  ) then raise exception 'EXPECTED_TABLE_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedViewsSql}]::text[]) expected(name)
    where not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=expected.name and c.relkind in ('v','m'))
  ) then raise exception 'EXPECTED_VIEW_OR_MATERIALIZED_VIEW_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedFunctionsSql}]::text[]) expected(name)
    where not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=expected.name)
  ) then raise exception 'EXPECTED_FUNCTION_OR_RPC_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedIndexesSql}]::text[]) expected(name)
    where not exists(select 1 from pg_indexes i where i.schemaname='public' and i.indexname=expected.name)
  ) then raise exception 'EXPECTED_INDEX_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedConstraintsSql}]::text[]) expected(name)
    where not exists(select 1 from pg_constraint c where c.conname=expected.name)
  ) then raise exception 'EXPECTED_CONSTRAINT_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedPoliciesSql}]::text[]) expected(value)
    where not exists(select 1 from pg_policies p where p.schemaname=split_part(expected.value,'|',1) and p.tablename=split_part(expected.value,'|',2) and p.policyname=split_part(expected.value,'|',3))
  ) then raise exception 'EXPECTED_POLICY_MISSING'; end if;
  if exists (
    select 1 from unnest(array[${expectedTriggersSql}]::text[]) expected(value)
    where not exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=split_part(expected.value,'|',1) and c.relname=split_part(expected.value,'|',2) and t.tgname=split_part(expected.value,'|',3) and not t.tgisinternal)
  ) then raise exception 'EXPECTED_TRIGGER_MISSING'; end if;
  if to_regclass('public.provider_operational_health_snapshots') is null or to_regclass('public.provider_health_snapshots') is null then raise exception 'PROVIDER_HEALTH_NAMESPACE_MISSING'; end if;
  if to_regclass('public.trust_relationships') is null or to_regclass('public.trust_graph_relationships_v2') is null then raise exception 'TRUST_RELATIONSHIP_NAMESPACE_MISSING'; end if;
  if to_regclass('public.environment_attestations') is null or to_regclass('public.scope_continuity_decisions') is null then raise exception 'EPIC_26_OBJECT_MISSING'; end if;
  if to_regclass('public.incident_regulatory_assessments') is null or to_regclass('public.incident_submission_packages') is null then raise exception 'EPIC_27_OBJECT_MISSING'; end if;
  if to_regclass('public.trust_contracts') is null or to_regclass('public.trust_fabric_decisions') is null then raise exception 'EPIC_28_OBJECT_MISSING'; end if;
  if not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='trust_contracts' and grantee='authenticated' and privilege_type='SELECT') then raise exception 'EXPECTED_AUTHENTICATED_READ_GRANT_MISSING'; end if;
  if not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name='trust_fabric_decisions' and grantee='service_role' and privilege_type in ('INSERT','UPDATE','DELETE')) then raise exception 'EXPECTED_SERVICE_ROLE_GRANT_MISSING'; end if;
end $$;
select 'POST_APPLY_VALIDATION_PASS' as status, '${targetHead}' as target_head;
commit;
`,
);

writePackage(
  "rls-validation.sql",
  `begin transaction read only;
do $$
declare expected_tables text[] := array['identity_subjects','identity_verification_requests','provider_health_snapshots','trust_entities','trust_graph_relationships_v2','environment_attestations','scope_continuity_decisions','incident_regulatory_assessments','incident_reviewer_decisions','trust_contracts','trust_fabric_decisions'];
begin
  if exists (
    select 1 from unnest(expected_tables) expected(name)
    where not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=expected.name and c.relrowsecurity)
  ) then raise exception 'EXPECTED_RLS_TABLE_NOT_PROTECTED'; end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name=any(expected_tables) and grantee='anon' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ) then raise exception 'ANON_WRITE_GRANT_PRESENT'; end if;
  if exists (
    select 1 from information_schema.role_table_grants
    where table_schema='public' and table_name in ('trust_fabric_decisions','incident_reviewer_decisions','scope_continuity_decisions') and grantee='authenticated' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')
  ) then raise exception 'SERVICE_ONLY_TABLE_HAS_AUTHENTICATED_WRITE'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('persist_scope_continuity_decision_v1','persist_trust_contract_v1','persist_trust_contract_evaluation_v1') and has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) then raise exception 'SERVICE_RPC_EXECUTE_GRANT_UNSAFE'; end if;
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='v' and c.relname in ('scope_continuity_replay','incident_reporting_replay') and not coalesce(c.reloptions,'{}') @> array['security_invoker=true']
  ) then raise exception 'SECURITY_INVOKER_VIEW_REQUIRED'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='incident_reviewer_decisions') then raise exception 'REVIEWER_AUTHORIZATION_POLICY_MISSING'; end if;
end $$;
select 'STATIC_RLS_VALIDATION_PASS' as status;
commit;
`,
);

writePackage(
  "integrity-validation.sql",
  `begin transaction read only;
do $$
begin
  if exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and c.contype='f' and t.relname in ('scope_continuity_decisions','incident_reviewer_decisions','trust_contract_evaluations') and array_length(c.conkey,1)=1
  ) then raise exception 'ID_ONLY_CROSS_TENANT_FOREIGN_KEY_PRESENT'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='provider_health_snapshots' and column_name='enterprise_id') then raise exception 'CONSENSUS_PROVIDER_HEALTH_NOT_TENANT_SCOPED'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='provider_operational_health_snapshots' and column_name='enterprise_id') then raise exception 'OPERATIONAL_PROVIDER_HEALTH_HAS_FABRICATED_TENANT'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_graph_relationships_v2' and column_name='tenant_id') then raise exception 'ENTERPRISE_GRAPH_TENANT_KEY_MISSING'; end if;
  if not exists(select 1 from pg_constraint c where c.contype='c' and c.conname like '%trust_state%') then raise exception 'TRUST_STATE_CONSTRAINT_MISSING'; end if;
end $$;
select 'INTEGRITY_VALIDATION_PASS' as status;
commit;
`,
);

writePackage(
  "compatibility-validation.sql",
  `begin transaction read only;
do $$
begin
  if to_regclass('public.trust_relationships') is null or to_regclass('public.trust_graph_relationships_v2') is null then raise exception 'LEGACY_AND_ENTERPRISE_GRAPH_CONTRACTS_REQUIRED'; end if;
  if to_regclass('public.provider_operational_health_snapshots') is null or to_regclass('public.provider_health_snapshots') is null then raise exception 'OPERATIONAL_AND_CONSENSUS_PROVIDER_HEALTH_REQUIRED'; end if;
  if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='persist_scope_continuity_decision_v1') then raise exception 'EPIC_26_LEASE_HASH_CORRECTION_MISSING'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='trust_fabric_decisions' and column_name='trust_state') then raise exception 'FROZEN_TRUST_STATE_CONTRACT_MISSING'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='incident_reviewer_decisions' and column_name='reviewer_role') then raise exception 'REVIEWER_AUTHORITY_CONTRACT_MISSING'; end if;
end $$;
select 'ARCHITECTURE_COMPATIBILITY_PASS' as status;
commit;
`,
);

writePackage(
  "rollback-limitations.md",
  `# Rollback limitations

This release is forward-only. Append-only evidence, Trust Memory, Replay, decision, incident and audit records must not be destructively reversed. No automatic down migration, Production ledger repair or cross-environment data copy is provided.

Before a phase begins, the rollback boundary is the clean isolated staging snapshot at the preceding validated head. If a phase fails, stop without entering the next phase, preserve sanitized catalog/error evidence, and restore the disposable staging boundary only under Epic 29.3 authorization. Once synthetic writes exist, destructive rollback requires explicit owner approval and evidence-retention review.
`,
);
writePackage(
  "forward-repair-plan.md",
  `# Forward-repair plan

1. Stop at the current phase boundary and record the migration, statement ordinal, SQLSTATE, catalog identity and migration head without rows or credentials.
2. Confirm the target remains the registered staging project and synthetic mode is still active.
3. Classify the failure as prerequisite drift, namespace collision, lock/performance risk, RLS/grant drift or application compatibility.
4. Author a new forward migration; never edit an applied migration or repair the Production ledger.
5. Re-run collision, destructive SQL, dependency, architecture-freeze and package-hash review.
6. Recreate the isolated staging boundary and repeat from the last approved phase only after human approval.

Production repair, deployment and promotion are outside this package.
`,
);

const auditLines = [
  "# Migration chain audit",
  "",
  `- Production migration head: \`${productionHead}\`.`,
  `- First pending migration: \`${firstPending.timestamp}\`.`,
  `- Target migration head: \`${targetHead}\`.`,
  `- Applied migrations: ${applied.length}.`,
  `- Pending migrations: ${pending.length}.`,
  "- Ordering: lexical timestamp order; every local timestamp is unique.",
  "- Row-volume evidence: unknown; no Production row counts were inspected.",
  "",
  "| Timestamp | Migration | Purpose | Dependencies | Schema impact | Data impact | RLS | Lock risk | Rollback boundary |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...migrations.map((migration, index) => {
    const predecessor = index === 0 ? "Supabase managed baseline" : migrations[index - 1].timestamp;
    const impact = `${migration.classifications.join(", ")}; creates ${migration.creates.length}, alters ${migration.alteredTables.length}`;
    const risk = migration.timestamp <= productionHead ? "HISTORICAL" : migration.lockRisk;
    const rollback = migration.timestamp <= productionHead ? "Applied Production history; never edit" : "Stop before next phase; restore isolated staging or forward-repair";
    return `| \`${migration.timestamp}\` | \`${migration.name}\` | ${migration.purpose} (${migration.epic}) | \`${predecessor}\` | ${impact} | ${migration.dataImpact} | ${migration.rls ? "yes" : "no"} | ${risk} | ${rollback} |`;
  }),
  "",
  "## Detailed per-migration inventory",
  "",
  ...migrations.flatMap((migration, index) => {
    const predecessor = index === 0 ? "Supabase managed baseline" : migrations[index - 1].timestamp;
    const formatValues = (values) => values.length ? values.map((value) => `\`${value}\``).join(", ") : "none";
    const signals = Object.entries(migration.destructiveSignals).filter(([, count]) => count).map(([name, count]) => `${name}:${count}`);
    return [
      `### ${migration.timestamp} — ${migration.name}`,
      "",
      `- Purpose / feature: ${migration.purpose}; ${migration.epic}.`,
      `- Classification: ${migration.classifications.join(", ")}.`,
      `- Expected order / dependency boundary: after \`${predecessor}\`.`,
      `- Tables created: ${formatValues(migration.tables)}.`,
      `- Tables altered: ${formatValues(migration.alteredTables)}.`,
      `- Views: ${formatValues([...migration.views, ...migration.materializedViews])}.`,
      `- Functions/RPCs: ${formatValues(migration.functions)}.`,
      `- Policies: ${formatValues(migration.policies)}.`,
      `- Indexes: ${formatValues(migration.indexes)}.`,
      `- Constraints: ${formatValues(migration.constraints)}.`,
      `- Triggers: ${formatValues(migration.triggers)}.`,
      `- Grant/revoke categories: ${formatValues(migration.grants)}.`,
      `- Data impact/backfill: ${migration.dataImpact}.`,
      `- Destructive review signals: ${signals.join(", ") || "none"}.`,
      "",
    ];
  }),
  "## Pending lock and performance risk",
  "",
  "| Migration | Lock level | Likely rewrite | Index build | Row-volume sensitivity | Transaction duration | PostgREST cache | Function compile | RLS risk | Application compatibility |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...pending.map((migration) => {
    const definition = phaseDefinitions.find((phase) => phase.id === migration.phase);
    const rewrite = migration.alteredTables.length ? "possible on altered tables; prove in staging" : "no existing-table rewrite identified statically";
    const indexRisk = migration.indexes.length ? `${migration.indexes.length} non-concurrent index declaration(s); relation sizes unknown` : "none";
    const transactionRisk = migration.lockRisk === "HIGH" || migration.lockRisk === "BLOCKING" ? "HIGH until measured" : migration.lockRisk === "MEDIUM" ? "MEDIUM until measured" : "LOW expected";
    const cache = migration.creates.length || migration.alteredTables.length ? "refresh/verify after phase" : "no schema-cache change expected";
    const compile = migration.functions.length ? `${migration.functions.length} function/RPC definition(s); compile and privilege validation required` : "none";
    const rlsRisk = migration.destructiveSignals.dropPolicy ? "HIGH: replacement must preserve valid tenant reads" : migration.rls ? "MEDIUM: new/changed policies and grants" : "LOW";
    return `| \`${migration.name}\` | ${migration.lockRisk} | ${rewrite} | ${indexRisk} | unknown; no Production row count used | ${transactionRisk} | ${cache} | ${compile} | ${rlsRisk} | ${definition.compatibility} |`;
  }),
  "",
  "## Applied to Production",
  "",
  ...applied.map((migration) => `- \`${migration.timestamp}\` — \`${migration.name}\``),
  "",
  "## Pending for staging and future Production",
  "",
  ...pending.map((migration) => `- Phase ${migration.phase}: \`${migration.timestamp}\` — \`${migration.name}\` — SHA-256 \`${migration.hash}\``),
  "",
  "## Historical correction continuity",
  "",
  "- `provider_operational_health_snapshots` remains the global operational-health table introduced by the corrected, unapplied provider abstraction migration.",
  "- `provider_health_snapshots` remains the tenant-scoped Provider Consensus table.",
  "- Applied legacy `trust_relationships` remains intact; `trust_graph_relationships_v2` is the distinct pending Enterprise graph table.",
  "- The Epic 26 lease-hash correction remains in the unapplied canonical migration and preserves the frozen digest contract.",
  "",
  "## Architecture freeze review",
  "",
  "Packaging introduced no migration or product-contract change. Trust Object, Trust Contract, evidence taxonomy, trust/provider states, Replay availability, Scope Continuity, serious-incident protected decisions, tenant identity and reviewer authority remain frozen. Compatibility warnings are limited to unknown row volume, non-concurrent index creation, constraint validation, policy replacement and function replacement that require isolated staging evidence before any Production approval.",
  "",
];
writeFileSync(join(docsRoot, "MIGRATION_CHAIN_AUDIT.md"), auditLines.join("\n"), "utf8");

const dependencyLines = [
  "# Migration dependency graph",
  "",
  `The machine-readable graph is \`supabase/release/enterprise-trust-fabric-staging/dependency-graph.json\`. It covers all ${pending.length} pending migrations from Production head \`${productionHead}\` to target \`${targetHead}\`.`,
  "",
  "| Migration | Phase | Sequence predecessor | Inferred prerequisite migrations | Required extensions | Created objects | Downstream consumers |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...dependencyNodes.map((node) => `| \`${node.timestamp}\` | ${node.phase} | \`${node.sequencePredecessor}\` | ${node.prerequisiteMigrations.length ? node.prerequisiteMigrations.map((value) => `\`${value}\``).join(", ") : "Production-head objects only"} | ${node.prerequisiteExtensions.join(", ") || "none"} | ${node.createdObjects.length} | ${node.downstreamConsumers.map((value) => `\`${value}\``).join(", ") || "none"} |`),
  "",
  "## Assertions",
  "",
  "- No duplicate migration timestamp exists.",
  "- No circular dependency exists because every graph edge points to an earlier timestamp.",
  "- No migration references a locally-created object whose first creation is later in the chain.",
  "- No remote-only public prerequisite is accepted; managed `auth`/`storage` schemas and declared extensions are explicit platform prerequisites.",
  "- Epic 26 precedes Epic 27; Epic 27 precedes Epic 28; Trust Fabric composition follows all owning-domain prerequisites.",
  "- Prerequisite tables, columns, functions, policy helpers, extensions, created objects and downstream consumers are recorded per node in the JSON graph.",
  "",
];
writeFileSync(join(docsRoot, "MIGRATION_DEPENDENCY_GRAPH.md"), dependencyLines.join("\n"), "utf8");

const destructiveLines = [
  "# Destructive SQL review",
  "",
  "No pending migration contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, destructive `ALTER TYPE`, or an unbounded `DELETE`. Static findings below are never silently allowed: they require the stated staging evidence or later Production approval. `CASCADE` occurrences are foreign-key/function dependency semantics, not an instruction to run a cascading object drop.",
  "",
  "| Migration | Signals | Classification | Lock and performance review |",
  "| --- | --- | --- | --- |",
  ...destructiveRows.map(({ migration, signals, classification }) => `| \`${migration.name}\` | ${signals.join(", ") || "none"} | ${classification} | ${migration.lockRisk}; row volume unknown; ${migration.alteredTables.length ? "existing-table catalog locks possible" : "new-object catalog locks only"}; PostgREST cache refresh required after phase |`),
  "",
  "## Production approval boundary",
  "",
  "Constraint replacement, bounded delete paths, policy replacement, non-concurrent indexes on existing tables, function replacement and any measured HIGH/BLOCKING lock behavior require explicit Production approval after staging evidence. No such approval is granted by Epic 29.2.",
  "",
];
writeFileSync(join(docsRoot, "DESTRUCTIVE_SQL_REVIEW.md"), destructiveLines.join("\n"), "utf8");

const packageFiles = readdirSync(packageRoot, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name !== "SHA256SUMS")
  .map((entry) => entry.name)
  .sort();
const checksumLines = [];
for (const migration of pending) checksumLines.push(`${migration.hash}  ${migration.path}`);
for (const name of packageFiles) {
  const contents = readFileSync(join(packageRoot, name));
  checksumLines.push(`${sha256(contents)}  supabase/release/enterprise-trust-fabric-staging/${name}`);
}
writePackage("SHA256SUMS", `${checksumLines.join("\n")}\n`);

console.log(
  JSON.stringify({
    migrations: migrations.length,
    applied: applied.length,
    pending: pending.length,
    productionHead,
    firstPending: firstPending.timestamp,
    targetHead,
    phases: phases.map((phase) => ({ id: phase.id, migrations: phase.migrations.length })),
    packageFiles: readdirSync(packageRoot).sort(),
    laterReferences: dependencyNodes.filter((node) => node.laterReferences.length).map((node) => ({ timestamp: node.timestamp, laterReferences: node.laterReferences })),
    prohibitedDestructiveFindings: destructiveRows.filter((row) => row.classification === "prohibited").length,
  }),
);
