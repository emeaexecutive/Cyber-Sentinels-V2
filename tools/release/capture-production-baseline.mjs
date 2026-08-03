import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import process from "node:process";

const confirmation = "--confirm-read-only-production";
if (!process.argv.includes(confirmation)) {
  throw new Error(`Refusing Production metadata capture without ${confirmation}`);
}

const repoRoot = process.cwd();
const registry = JSON.parse(
  readFileSync(join(repoRoot, "config", "environments", "registry.json"), "utf8"),
);
const production = registry.environments.find((entry) => entry.production === true);
if (!production || !production.permittedOperations.includes("read_only_inventory")) {
  throw new Error("Production read-only inventory is not registered as permitted");
}

const linkedReference = readFileSync(
  join(repoRoot, "supabase", ".temp", "project-ref"),
  "utf8",
).trim();
if (linkedReference !== production.projectReference) {
  throw new Error("Linked target does not match the registered Production reference");
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
function supabase(argumentsList) {
  const result = spawnSync(
    executable,
    ["--no-install", "supabase", ...argumentsList],
    {
      cwd: repoRoot,
      encoding: "utf8",
      windowsHide: true,
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Read-only Supabase command failed: ${result.error?.message ?? result.stderr?.trim() ?? "unknown error"}`,
    );
  }
  return JSON.parse(result.stdout);
}

const queryResult = supabase([
  "db",
  "query",
  "--linked",
  "--file",
  "tools/release/capture-production-baseline-readonly.sql",
  "--output",
  "json",
]);
const migrationResult = supabase(["migration", "list", "--linked"]);
const projects = supabase(["projects", "list", "--output", "json"]);

const baseline = queryResult.rows?.[0]?.sanitized_baseline;
if (!baseline || typeof baseline !== "object") {
  throw new Error("Sanitized Production catalog result is missing");
}
const project = projects.find(
  (entry) => entry.id === production.projectReference || entry.ref === production.projectReference,
);
if (!project) throw new Error("Registered Production project was not found in project inventory");

const appliedTimestamps = migrationResult.migrations
  .filter((entry) => entry.remote)
  .map((entry) => entry.remote);
const productionHead = appliedTimestamps.at(-1);
if (!productionHead) throw new Error("Production migration ledger is empty");

function section(title, values) {
  const normalized = [...new Set(values ?? [])].sort();
  return [
    `## ${title} (${normalized.length})`,
    "",
    ...(normalized.length ? normalized.map((value) => `- \`${value}\``) : ["- None."]),
    "",
  ];
}

const lines = [
  "# Sanitized Production baseline",
  "",
  `- Capture timestamp: ${baseline.captured_at_utc}Z`,
  "- Source classification: read-only Production metadata.",
  `- Production project reference: \`${production.projectReference}\` (identifier only; no credentials).`,
  `- Region: \`${project.region}\`.`,
  `- PostgreSQL version: \`${baseline.postgres_version}\` (major 17).`,
  `- Current Production migration head: \`${productionHead}\`.`,
  `- Applied migration count: ${appliedTimestamps.length}.`,
  "- Backup status: not owner-confirmed in this capture.",
  "- PITR status: not owner-confirmed in this capture.",
  "- Production mutation: none; the capture query ran inside a read-only transaction.",
  "",
  "## Applied migration timestamps",
  "",
  ...appliedTimestamps.map((timestamp) => `- \`${timestamp}\``),
  "",
  ...section("Installed extensions", baseline.extensions),
  ...section("Tables", baseline.tables),
  ...section("Views", baseline.views),
  ...section("Materialized views", baseline.materialized_views),
  ...section("Function and RPC signatures", baseline.function_signatures),
  ...section("RLS-enabled tables", baseline.rls_enabled_tables),
  ...section("Policies", baseline.policies),
  ...section("Indexes", baseline.indexes),
  ...section("Triggers", baseline.triggers),
  ...section("Grant categories", baseline.grant_categories),
  ...section("Auth and Storage foreign-key dependencies", baseline.auth_storage_foreign_keys),
  ...section(
    "Auth and Storage function dependencies",
    baseline.auth_storage_function_dependencies,
  ),
  "## Known limitations",
  "",
  "- This baseline contains catalog names and signatures only. It intentionally excludes rows, Auth identities, Storage objects, evidence, credentials, connection strings, function bodies, policy expressions, index definitions and private schema payloads.",
  "- Row counts, table sizes, query plans, lock timing and data distribution were not inspected; all row-volume risk remains unknown until isolated staging measurement.",
  "- Backup and PITR state remain unknown because no owner-confirmed entitlement evidence was available to this read-only capture.",
  "- Catalog names describe the capture time only; Epic 29.3 must verify the isolated staging starting boundary independently before any migration execution.",
  "",
  "## Safety confirmation",
  "",
  "The linked reference was matched to the Production entry in the environment registry before inspection. Only the migration ledger, project metadata and the SELECT-only catalog query in `tools/release/capture-production-baseline-readonly.sql` were executed. No Production row was selected, no migration was applied, no ledger was repaired and no schema or data mutation occurred.",
  "",
];

const output = resolve(repoRoot, "docs", "release", "PRODUCTION_BASELINE_SANITIZED.md");
writeFileSync(output, lines.join("\n"), "utf8");
console.log(
  JSON.stringify({
    output: basename(output),
    productionHead,
    appliedMigrationCount: appliedTimestamps.length,
    captureTimestamp: `${baseline.captured_at_utc}Z`,
    tableCount: baseline.tables.length,
    viewCount: baseline.views.length,
    materializedViewCount: baseline.materialized_views.length,
    functionCount: baseline.function_signatures.length,
    rlsTableCount: baseline.rls_enabled_tables.length,
    policyCount: baseline.policies.length,
    indexCount: baseline.indexes.length,
    triggerCount: baseline.triggers.length,
  }),
);
