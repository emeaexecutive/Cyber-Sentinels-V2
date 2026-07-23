import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const paths = [
  "../app/api/trust/entity/route.ts",
  "../app/api/trust/entity/[id]/route.ts",
  "../app/api/trust/entity/[id]/summary/route.ts",
  "../app/api/trust/entity/[id]/timeline/route.ts",
  "../app/api/trust/entity/[id]/graph/route.ts",
  "../app/api/trust/evidence/route.ts",
  "../app/api/trust/relationship/route.ts",
  "../app/api/trust/relationship/[id]/route.ts",
  "../app/api/admin/trust-graph/system-health/route.ts",
  "../app/api/admin/trust-graph/provider-health/route.ts",
  "../app/api/admin/trust-graph/relationship-statistics/route.ts",
  "../app/api/admin/trust-graph/entity-statistics/route.ts",
  "../app/api/admin/trust-graph/tenant-statistics/route.ts",
];
const files = Object.fromEntries(
  paths.map((path) => [path, readFileSync(new URL(path, import.meta.url), "utf8")]),
);

test("every Enterprise Trust Graph API authenticates tenant context and fails safely", () => {
  for (const [path, source] of Object.entries(files)) {
    assert.match(source, /trustGraphContext\(request/, path);
    assert.match(source, /trustGraphFailure\(error, correlationId\)/, path);
    assert.match(source, /trustGraphResponse/, path);
  }
});

test("every graph mutation uses CSRF/content controls and restricted roles", () => {
  for (const path of [
    "../app/api/trust/entity/route.ts",
    "../app/api/trust/entity/[id]/route.ts",
    "../app/api/trust/evidence/route.ts",
    "../app/api/trust/relationship/route.ts",
    "../app/api/trust/relationship/[id]/route.ts",
  ]) {
    const source = files[path];
    assert.match(source, /trustGraphContext\(request, true/, path);
    assert.match(source, /\["owner", "admin", "reviewer"\]/, path);
  }
});

test("required methods and optimistic version controls are present", () => {
  assert.match(files["../app/api/trust/entity/route.ts"], /export async function POST/);
  assert.match(files["../app/api/trust/entity/[id]/route.ts"], /export async function GET/);
  assert.match(files["../app/api/trust/entity/[id]/route.ts"], /export async function PATCH/);
  assert.match(files["../app/api/trust/evidence/route.ts"], /export async function GET/);
  assert.match(files["../app/api/trust/evidence/route.ts"], /export async function POST/);
  assert.match(files["../app/api/trust/relationship/route.ts"], /export async function POST/);
  assert.match(files["../app/api/trust/relationship/[id]/route.ts"], /export async function DELETE/);
  assert.match(files["../app/api/trust/relationship/[id]/route.ts"], /if-match/);
  assert.match(files["../app/api/trust/entity/[id]/route.ts"], /expectedVersion/);
});

test("admin graph APIs are owner/admin only", () => {
  for (const [path, source] of Object.entries(files).filter(([path]) => path.includes("/admin/"))) {
    assert.match(source, /\["owner", "admin"\]/, path);
  }
});
