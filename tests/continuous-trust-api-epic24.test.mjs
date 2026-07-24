import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const routes = [
  ["app/api/trust/signals/route.ts", ["GET", "POST"]],
  ["app/api/trust/entities/[entityId]/state/route.ts", ["GET"]],
  ["app/api/trust/entities/[entityId]/signals/route.ts", ["GET"]],
  ["app/api/trust/entities/[entityId]/drift/route.ts", ["GET"]],
  ["app/api/trust/entities/[entityId]/transitions/route.ts", ["GET"]],
  ["app/api/trust/entities/[entityId]/recalculate/route.ts", ["POST"]],
  ["app/api/trust/entities/[entityId]/manual-review/route.ts", ["POST"]],
  ["app/api/trust/entities/[entityId]/override/route.ts", ["POST"]],
  ["app/api/trust/alerts/[id]/route.ts", ["GET"]],
  ["app/api/trust/alerts/[id]/acknowledge/route.ts", ["POST"]],
  ["app/api/trust/alerts/[id]/resolve/route.ts", ["POST"]],
  ["app/api/trust/alerts/[id]/dismiss/route.ts", ["POST"]],
];

test("all EPIC 24 API contracts exist and use tenant-scoped authorization", async () => {
  for (const [path, methods] of routes) {
    const text = await source(path);
    for (const method of methods) assert.match(text, new RegExp(`export async function ${method}`));
    assert.match(text, /continuousTrust(Context|CorrelationId)|mutationContext/);
    assert.match(text, /continuousTrust(Failure|Response)/);
  }
});

test("signal ingestion is rate-limited, idempotent, and does not accept caller tenant IDs", async () => {
  const text = await source("app/api/trust/signals/route.ts");
  assert.match(text, /checkRequestRateLimit/);
  assert.match(text, /idempotency-key/);
  assert.match(text, /tenantId: auth\.enterpriseId/);
  assert.doesNotMatch(text, /tenantId: body\./);
  assert.match(text, /\["owner", "admin", "reviewer"\]/);
});

test("override and cron execution are narrowly authorized", async () => {
  const override = await source("app/api/trust/entities/[entityId]/override/route.ts");
  const worker = await source("app/api/trust/jobs/process/route.ts");
  assert.match(override, /\["owner", "admin"\]/);
  assert.match(override, /applyContinuousTrustOverride/);
  assert.match(worker, /CRON_SECRET/);
  assert.match(worker, /timingSafeEqual/);
  assert.doesNotMatch(worker, /NEXT_PUBLIC_/);
});

test("dashboard exposes measured signals, deltas, drift, review and provider health", async () => {
  const dashboard = await source(
    "src/components/continuous-trust/ContinuousTrustDashboard.tsx",
  );
  for (const label of [
    "Recent normalized signals",
    "Delta",
    "Trust drift and alerts",
    "Manual review queue",
    "Provider health",
  ]) assert.match(dashboard, new RegExp(label));
  assert.match(dashboard, /pollIntervalMs = 30_000/);
  assert.match(dashboard, /document\.visibilityState/);
  assert.match(dashboard, /aria-live="polite"/);
});

test("no competing OpenAPI document was introduced", async () => {
  const packageJson = await source("package.json");
  assert.doesNotMatch(packageJson, /swagger-ui|openapi-types/);
});
