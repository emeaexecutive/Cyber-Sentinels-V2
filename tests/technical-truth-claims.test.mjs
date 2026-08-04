import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function pathExists(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test("homepage uses the technical-truth external statement without unsupported production claims", async () => {
  const source = await read("app/page.tsx");
  assert.match(source, /Enterprise Trust Infrastructure/i);
  assert.match(source, /continuously verifies that the identity, authority, environment, evidence and operational scope/i);
  assert.doesNotMatch(source, /production-proven|fully integrated|cryptographically immutable|autonomous|deepfake detection|eIDAS/i);
});

test("release truth artifacts exist for the design-partner baseline", async () => {
  const requiredDocs = [
    "docs/release/EPIC_29_ACTUAL_STATUS.md",
    "docs/TECHNICAL_TRUTH_PUBLIC_CLAIMS_AUDIT.md",
    "docs/release/NINETY_DAY_ENGINEERING_PLAN.md",
    "docs/design-partner/DESIGN_PARTNER_TRANSACTION_PLAN.md",
  ];

  for (const doc of requiredDocs) {
    assert.equal(await pathExists(doc), true, `${doc} should exist`);
  }

  const releaseStatus = await read("docs/release/EPIC_29_ACTUAL_STATUS.md");
  assert.match(releaseStatus, /live validation|Partially implemented|Not confirmed/i);
});
