import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrationRoot = new URL("../supabase/migrations/", import.meta.url);
const migrationNames = (await readdir(migrationRoot))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();
const migrations = await Promise.all(
  migrationNames.map(async (name) => ({
    name,
    timestamp: name.split("_")[0],
    sql: await readFile(new URL(name, migrationRoot), "utf8"),
  })),
);
const pending = migrations.filter((migration) => migration.timestamp > "202606090003");

function occurrences(expression, select) {
  return migrations.flatMap((migration) =>
    [...migration.sql.matchAll(expression)].map((match) => ({
      ...select(match),
      file: migration.name,
      offset: match.index ?? 0,
    })),
  );
}

function grouped(items, key) {
  const groups = new Map();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

test("Production split and migration timestamp inventory remain exact", () => {
  assert.equal(migrations.length, 79);
  assert.equal(pending.length, 34);
  assert.equal(pending[0].timestamp, "202606100001");
  assert.equal(pending.at(-1).timestamp, "202608080003");
  assert.equal(new Set(migrations.map((migration) => migration.timestamp)).size, migrations.length);
});

test("pending migrations contain no prohibited destructive SQL", () => {
  for (const migration of pending) {
    assert.doesNotMatch(migration.sql, /\bdrop\s+(?:table|column)\b/i, migration.name);
    assert.doesNotMatch(migration.sql, /\btruncate\b/i, migration.name);
    assert.doesNotMatch(migration.sql, /\balter\s+(?:column\s+\w+\s+)?type\b/i, migration.name);
    for (const statement of migration.sql.split(";")) {
      if (/\bdelete\s+from\b/i.test(statement)) {
        assert.match(statement, /\bwhere\b/i, `${migration.name} has an unbounded DELETE`);
      }
    }
  }
});

test("relations and materialized views have no undocumented namespace collision", () => {
  const allowedGuardedTableRecreation = new Set([
    "api_keys",
    "enterprise_access_requests",
    "notifications",
  ]);
  const relations = occurrences(
    /create\s+(?:or\s+replace\s+)?(materialized\s+view|table|view)\s+(if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][\w$]*)"?/gi,
    (match) => ({
      kind: match[1].toLowerCase().replace(/\s+/g, " "),
      guarded: Boolean(match[2]),
      name: match[3].toLowerCase(),
    }),
  );
  for (const [name, definitions] of grouped(relations, (item) => item.name)) {
    if (definitions.length === 1) continue;
    assert.equal(new Set(definitions.map((item) => item.kind)).size, 1, `${name} changes relation kind`);
    assert.ok(allowedGuardedTableRecreation.has(name), `${name} is recreated without documentation`);
    assert.ok(definitions.every((item) => item.kind === "table" && item.guarded));
  }
  const materializedViews = relations.filter((relation) => relation.kind === "materialized view");
  assert.equal(new Set(materializedViews.map((relation) => relation.name)).size, materializedViews.length);
});

test("indexes, constraints, policies and triggers have compatible namespaces", () => {
  const indexes = occurrences(
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?"?([a-z_][\w$]*)"?/gi,
    (match) => ({ name: match[1].toLowerCase() }),
  );
  for (const [name, definitions] of grouped(indexes, (item) => item.name)) {
    assert.equal(definitions.length, 1, `${name} index repeats in ${definitions.map((item) => item.file).join(", ")}`);
  }

  const policies = occurrences(
    /create\s+policy\s+(?:"([^"]+)"|([a-z_][\w$]*))\s+on\s+(?:public\.)?"?([a-z_][\w$]*)"?/gi,
    (match) => ({ name: (match[1] ?? match[2]).toLowerCase(), table: match[3].toLowerCase() }),
  );
  for (const [key, definitions] of grouped(policies, (item) => `${item.table}.${item.name}`)) {
    for (const definition of definitions.slice(1)) {
      const sql = migrations.find((migration) => migration.name === definition.file)?.sql ?? "";
      const escaped = definition.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(
        sql,
        new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"?${escaped}"?\\s+on\\s+(?:public\\.)?"?${definition.table}"?`, "i"),
        `${key} repeats without an explicit compatible drop in ${definition.file}`,
      );
    }
  }

  const triggers = occurrences(
    /create\s+trigger\s+"?([a-z_][\w$]*)"?[\s\S]{0,240}?\bon\s+(?:public\.)?"?([a-z_][\w$]*)"?/gi,
    (match) => ({ name: match[1].toLowerCase(), table: match[2].toLowerCase() }),
  );
  for (const [key, definitions] of grouped(triggers, (item) => `${item.table}.${item.name}`)) {
    assert.equal(definitions.length, 1, `${key} trigger repeats`);
  }

  const ordered = migrations.map((migration) => migration.sql).join("\n");
  const constraints = [...ordered.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?"?([a-z_][\w$]*)"?([\s\S]*?);/gi)]
    .flatMap((statement) => [...statement[2].matchAll(/add\s+constraint\s+"?([a-z_][\w$]*)"?/gi)]
      .map((constraint) => ({ table: statement[1].toLowerCase(), name: constraint[1].toLowerCase(), offset: (statement.index ?? 0) + (constraint.index ?? 0) })));
  for (const [key, definitions] of grouped(constraints, (item) => `${item.table}.${item.name}`)) {
    for (let index = 1; index < definitions.length; index += 1) {
      const between = ordered.slice(definitions[index - 1].offset, definitions[index].offset);
      const escaped = definitions[index].name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.match(between, new RegExp(`drop\\s+constraint\\s+(?:if\\s+exists\\s+)?"?${escaped}"?`, "i"), `${key} repeats without an explicit compatible drop`);
    }
  }
});

test("duplicate function signatures are explicit CREATE OR REPLACE operations", () => {
  const functions = occurrences(
    /create\s+(or\s+replace\s+)?function\s+((?:public\.)?"?[a-z_][\w$]*"?)\s*\(([^)]*)\)/gi,
    (match) => ({
      replace: Boolean(match[1]),
      signature: `${match[2].replaceAll('"', "").toLowerCase()}(${match[3].replace(/\s+/g, " ").trim().toLowerCase()})`,
    }),
  );
  for (const [signature, definitions] of grouped(functions, (item) => item.signature)) {
    if (definitions.length === 1) continue;
    assert.ok(definitions.slice(1).every((definition) => definition.replace), `${signature} repeats without OR REPLACE`);
  }
});

test("pending relation and function DDL is schema-qualified", () => {
  for (const migration of pending) {
    const ddl = [
      ...migration.sql.matchAll(/\b(?:create\s+(?:or\s+replace\s+)?(?:table|view|materialized\s+view|function)|alter\s+table)\s+(?:if\s+not\s+exists\s+)?(?:only\s+)?((?:"?[a-z_][\w$]*"?\.)?"?[a-z_][\w$]*"?)/gi),
    ];
    for (const match of ddl) {
      const identifier = match[1].replaceAll('"', "");
      const suffix = migration.sql.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 4);
      if (identifier.toLowerCase() === "public" && suffix.startsWith(".%I")) continue;
      assert.match(identifier, /^(?:public|auth|storage)\./i, `${migration.name} has ambiguous DDL identifier: ${identifier}`);
    }
  }
});

test("intentional provider and trust relationship distinctions remain exact", () => {
  const provider = migrations.find((migration) => migration.name === "202607170002_provider_abstraction_hopae.sql").sql;
  const consensus = migrations.find((migration) => migration.name === "202607200003_provider_consensus_engine.sql").sql;
  const legacy = migrations.find((migration) => migration.name === "202606080001_trust_relationships.sql").sql;
  const graph = migrations.find((migration) => migration.name === "202607230002_enterprise_trust_graph.sql").sql;
  assert.match(provider, /create table if not exists public\.provider_operational_health_snapshots/i);
  assert.doesNotMatch(provider, /create table (?:if not exists )?public\.provider_health_snapshots/i);
  assert.match(consensus, /create table (?:if not exists )?public\.provider_health_snapshots/i);
  assert.match(legacy, /create table if not exists public\.trust_relationships/i);
  assert.match(graph, /create table public\.trust_graph_relationships_v2/i);
  assert.doesNotMatch(graph, /create table public\.trust_relationships\b/i);
});

test("Epic 26 lease hash correction and Epic ordering remain intact", () => {
  const epic26 = migrations.find((migration) => migration.timestamp === "202607310001");
  const epic27 = migrations.find((migration) => migration.timestamp === "202608010001");
  const epic28 = migrations.find((migration) => migration.timestamp === "202608010002");
  assert.ok(epic26.timestamp < epic27.timestamp && epic27.timestamp < epic28.timestamp);
  assert.match(epic26.sql, /digest\([\s\S]*?lease_hash[\s\S]*?'sha256'/i);
});
