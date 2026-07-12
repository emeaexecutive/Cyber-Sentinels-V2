import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("authenticated shell exposes the seven canonical workspace areas", async () => {
  const source = await read("components/trust-os/enterprise-shell.tsx");
  for (const area of ["Overview", "Operations", "Trust", "Runtime", "Governance", "Providers", "Administration"]) {
    assert.match(source, new RegExp(`"${area}"`));
  }
  assert.match(source, /aria-label="Enterprise workspace areas"/);
});

test("global context has one canonical bar with all required dimensions", async () => {
  const source = await read("components/trust-os/enterprise-shell.tsx");
  assert.equal((source.match(/aria-label="Global trust context"/g) ?? []).length, 1);
  for (const field of ["Organization", "Workspace", "Current Workflow", "Current Entity", "Current Trust Posture", "Authority State", "Active Investigation", "Correlation ID"]) {
    assert.match(source, new RegExp(field));
  }
});

test("platform health exposes truthful service checks and safe degraded states", async () => {
  const [health, page, guidance] = await Promise.all([
    read("lib/core/platform-health.ts"),
    read("app/admin/trust-execution/page.tsx"),
    read("lib/trust-os/degraded-states.ts"),
  ]);
  for (const service of ["Application", "Authentication", "Trust Engine", "Runtime Engine", "Replay", "Governance", "Validation", "Providers", "Queues", "Database", "Deployment / build"]) {
    assert.match(page, new RegExp(service.replace("/", "\\/")));
  }
  assert.match(health, /databaseHealth/);
  assert.match(health, /trustEngineHealth/);
  for (const state of ["Provider unavailable", "Provider awaiting credentials", "Authorization service unavailable", "Replay write delayed", "Trust Memory update delayed", "Governance queue delayed", "Session expired", "Insufficient or partial trust result"]) {
    assert.match(guidance, new RegExp(state));
  }
});

test("ML and provider truth labels remain explicit", async () => {
  const [engine, statusPage] = await Promise.all([
    read("lib/detection/detection-engine.ts"),
    read("app/admin/detection-status/page.tsx"),
  ]);
  for (const label of ["Real ML", "Provider API", "Heuristic Baseline", "Runtime Intelligence", "Awaiting Credentials", "Not Implemented"]) {
    assert.match(engine, new RegExp(label));
  }
  assert.match(statusPage, /Insufficient Validation/);
  assert.match(statusPage, /Do not publish precision or recall/);
});

test("command palette supports Ctrl K and federates existing search destinations", async () => {
  const [shell, palette, context] = await Promise.all([
    read("components/trust-os/enterprise-shell.tsx"),
    read("components/trust-os/command-palette.tsx"),
    read("lib/trust-os/context.ts"),
  ]);
  assert.match(shell, /event\.key\.toLowerCase\(\) === "k"/);
  assert.match(palette, /Search enterprise trust records and destinations/);
  for (const category of ["Humans", "AI Agents", "Machine Identities", "Evidence", "Replay", "Trust Memory", "Governance Records", "Provider Records", "Workflows"]) {
    assert.match(context, new RegExp(category));
  }
  assert.match(palette, /route authorization and RLS/);
});

test("persistent status uses seven bounded health categories", async () => {
  const layout = await read("app/layout.tsx");
  for (const category of ["Platform", "Trust", "Providers", "Runtime", "Queues", "Validation", "Security"]) {
    assert.match(layout, new RegExp(`label: "${category}"`));
  }
  assert.match(layout, /buildPlatformHealth\(\{ authConfigured: true \}\)/);
  assert.match(layout, /process-local, not fleet-wide telemetry/);
});

test("heavy authenticated areas have shared streaming loading boundaries", async () => {
  await Promise.all([
    "app/dashboard/loading.tsx",
    "app/workspace/loading.tsx",
    "app/trust-center/loading.tsx",
    "app/notifications/loading.tsx",
  ].map(read));
  const shell = await read("components/trust-os/enterprise-shell.tsx");
  assert.match(shell, /dynamic\(\(\) => import\("@\/components\/trust-os\/command-palette"\)\)/);
});

test("public navigation remains separate from the authenticated Trust OS", async () => {
  const [layout, navigation] = await Promise.all([
    read("app/layout.tsx"),
    read("components/global-navigation.tsx"),
  ]);
  assert.match(layout, /accessLevel === "public" \? children/);
  assert.match(navigation, /Enterprise Workspace/);
  assert.match(navigation, /Administration/);
});

test("Sprint 10.1 documentation is complete", async () => {
  await Promise.all([
    "docs/ENTERPRISE_WORKSPACE.md",
    "docs/TRUST_OS.md",
    "docs/ENTERPRISE_NAVIGATION.md",
    "docs/COMPONENT_STANDARDS.md",
    "docs/demos/ENTERPRISE_TRUST_OS_WALKTHROUGH.md",
    "docs/SPRINT_10_1_ACCEPTANCE_CRITERIA.md",
  ].map(read));
});
