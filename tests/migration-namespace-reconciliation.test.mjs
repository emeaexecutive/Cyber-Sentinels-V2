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
    sql: await readFile(new URL(name, migrationRoot), "utf8"),
  })),
);
const reconciliation = await readFile(
  new URL("../docs/TRUST_RELATIONSHIPS_SCHEMA_RECONCILIATION.md", import.meta.url),
  "utf8",
);

const documentedCompatibleRelationRecreations = new Set([
  "api_keys",
  "enterprise_access_requests",
  "notifications",
]);

function occurrences(expression, select) {
  const results = [];
  for (const migration of migrations) {
    for (const match of migration.sql.matchAll(expression)) {
      results.push({ ...select(match), file: migration.name, offset: match.index ?? 0 });
    }
  }
  return results;
}

function grouped(items, key) {
  const groups = new Map();
  for (const item of items) {
    const value = key(item);
    groups.set(value, [...(groups.get(value) ?? []), item]);
  }
  return groups;
}

test("migration timestamps remain unique", () => {
  const timestamps = migrationNames.map((name) => name.match(/^(\d+)/)?.[1]);
  assert.equal(new Set(timestamps).size, timestamps.length);
});

test("relation creation has no hidden table/view or incompatible duplicate collision", () => {
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
    assert.equal(
      new Set(definitions.map((item) => item.kind)).size,
      1,
      `${name} collides across relation kinds: ${definitions.map((item) => `${item.file}:${item.kind}`).join(", ")}`,
    );
    assert.ok(
      documentedCompatibleRelationRecreations.has(name),
      `${name} is created more than once: ${definitions.map((item) => item.file).join(", ")}`,
    );
    assert.ok(definitions.every((item) => item.kind === "table" && item.guarded));
    assert.match(reconciliation, new RegExp(`\\b${name}\\b`));

    for (const definition of definitions.slice(1)) {
      const sql = migrations.find((item) => item.name === definition.file)?.sql ?? "";
      assert.match(
        sql,
        new RegExp(`alter\\s+table\\s+public\\.${name}\\s+add\\s+column\\s+if\\s+not\\s+exists`, "i"),
        `${definition.file} must explicitly reconcile the guarded ${name} recreation`,
      );
    }
  }
});

test("index names are globally unique across the public migration namespace", () => {
  const indexes = occurrences(
    /create\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?"?([a-z_][\w$]*)"?/gi,
    (match) => ({ name: match[1].toLowerCase() }),
  );
  for (const [name, definitions] of grouped(indexes, (item) => item.name)) {
    assert.equal(
      definitions.length,
      1,
      `${name} index is created repeatedly: ${definitions.map((item) => item.file).join(", ")}`,
    );
  }
});

function orderedSql() {
  let offset = 0;
  let sql = "";
  const fileAt = [];
  for (const migration of migrations) {
    fileAt.push({ start: offset, file: migration.name });
    sql += `${migration.sql}\n`;
    offset = sql.length;
  }
  return { sql, fileAt };
}

function sourceFile(fileAt, offset) {
  return [...fileAt].reverse().find((item) => item.start <= offset)?.file ?? "unknown";
}

test("repeated named constraints are preceded by an explicit compatible drop", () => {
  const { sql, fileAt } = orderedSql();
  const constraints = [];
  const tableBlock = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][\w$]*)"?\s*\(([\s\S]*?)\n\);/gi;
  for (const table of sql.matchAll(tableBlock)) {
    for (const constraint of table[2].matchAll(/\bconstraint\s+"?([a-z_][\w$]*)"?/gi)) {
      constraints.push({ table: table[1].toLowerCase(), name: constraint[1].toLowerCase(), offset: (table.index ?? 0) + (constraint.index ?? 0) });
    }
  }
  for (const statement of sql.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?"?([a-z_][\w$]*)"?([\s\S]*?);/gi)) {
    for (const constraint of statement[2].matchAll(/add\s+constraint\s+"?([a-z_][\w$]*)"?/gi)) {
      constraints.push({
        table: statement[1].toLowerCase(),
        name: constraint[1].toLowerCase(),
        offset: (statement.index ?? 0) + (constraint.index ?? 0),
      });
    }
  }

  for (const [key, definitions] of grouped(constraints.sort((a, b) => a.offset - b.offset), (item) => `${item.table}.${item.name}`)) {
    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];
      const between = sql.slice(previous.offset, current.offset);
      const drop = new RegExp(`alter\\s+table\\s+(?:only\\s+)?(?:public\\.)?"?${current.table}"?[\\s\\S]{0,180}?drop\\s+constraint\\s+(?:if\\s+exists\\s+)?"?${current.name}"?`, "i");
      assert.match(between, drop, `${key} repeats without a compatible drop before ${sourceFile(fileAt, current.offset)}`);
    }
  }
});

test("repeated policy names on one table are preceded by an explicit drop", () => {
  const { sql, fileAt } = orderedSql();
  const policies = [...sql.matchAll(/create\s+policy\s+(?:"([^"]+)"|([a-z_][\w$]*))\s+on\s+(?:public\.)?"?([a-z_][\w$]*)"?/gi)]
    .map((match) => ({
      name: (match[1] ?? match[2]).toLowerCase(),
      table: match[3].toLowerCase(),
      offset: match.index ?? 0,
    }));

  for (const [key, definitions] of grouped(policies, (item) => `${item.table}.${item.name}`)) {
    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];
      const between = sql.slice(previous.offset, current.offset);
      const escaped = current.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const drop = new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"?${escaped}"?\\s+on\\s+(?:public\\.)?"?${current.table}"?`, "i");
      assert.match(between, drop, `${key} repeats without a drop before ${sourceFile(fileAt, current.offset)}`);
    }
  }
});
