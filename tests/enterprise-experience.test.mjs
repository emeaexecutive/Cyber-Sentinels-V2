import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

async function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = path.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? filesUnder(relative) : [relative];
  }));
  return files.flat();
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function hasNativeDestination(target) {
  const pathname = target.split(/[?#]/, 1)[0];
  const relative = pathname === "/" ? "" : pathname.slice(1);
  if (await exists(path.join("app", relative, "page.tsx"))) return true;
  if (await exists(path.join("app", relative, "route.ts"))) return true;
  if (pathname.startsWith("/docs/") && await exists(path.join("app", "docs", "[slug]", "route.ts"))) return true;
  return false;
}

test("buyer documentation and pilot checklist are native Enterprise routes", async () => {
  const [buyerPage, checklistPage, layout] = await Promise.all([
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
    read("app/enterprise/layout.tsx"),
  ]);

  for (const marker of ["CISO", "CIO / CTO", "Compliance", "CEO / Investor", "Current evidence boundary"]) {
    assert.match(buyerPage, new RegExp(marker.replace("/", "\\/")));
  }
  for (const marker of ["Before kickoff", "Success metrics", "Deployment timeline", "Responsibilities and support", "Rollback"]) {
    assert.match(checklistPage, new RegExp(marker));
  }
  assert.match(layout, /enterpriseNavigation\.map/);
});

test("Enterprise CTAs use one internal contract", async () => {
  const [contract, overview, pilot, buyerPage, checklistPage] = await Promise.all([
    read("lib/enterprise-experience.ts"),
    read("app/enterprise/page.tsx"),
    read("app/enterprise/pilot/page.tsx"),
    read("app/enterprise/buyer-documentation/page.tsx"),
    read("app/enterprise/pilot-checklist/page.tsx"),
  ]);

  for (const action of ["requestDemo", "bookPilot", "requestControlledPilot", "buyerDocumentation", "pilotChecklist"]) {
    assert.match(contract, new RegExp(`${action}:`));
  }
  for (const source of [overview, pilot, buyerPage, checklistPage]) assert.match(source, /enterpriseCtas\./);
  assert.doesNotMatch(`${overview}\n${pilot}`, /\/docs\/(BUYER_JOURNEYS|ENTERPRISE_PILOT_CHECKLIST)\.md/);
});

test("all literal Enterprise links stay inside a native application route", async () => {
  const enterpriseFiles = (await filesUnder("app/enterprise")).filter((file) => file.endsWith(".tsx"));
  const sources = await Promise.all([
    ...enterpriseFiles.map(read),
    read("lib/enterprise-experience.ts"),
    read("lib/enterprise-readiness.ts"),
  ]);
  const targets = sources.flatMap((source) => [...source.matchAll(/(?:\bhref|evidenceHref)(?:=|:)\s*["']([^"']+)["']/g)].map((match) => match[1]));

  assert.ok(targets.length > 20, "expected the Enterprise audit to cover the current navigation surface");
  for (const target of new Set(targets)) {
    assert.match(target, /^\//, `Enterprise link must be application-relative: ${target}`);
    assert.equal(await hasNativeDestination(target), true, `Enterprise link has no native destination: ${target}`);
  }
});
