import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("developer experience pages present the human-readable API reference and a coherent quickstart journey", async () => {
  const [docsPage, quickstartPage, referencePage] = await Promise.all([
    read("app/developers/docs/page.tsx"),
    read("app/developers/quickstart/page.tsx"),
    read("app/developers/api-reference/page.tsx"),
  ]);

  assert.match(docsPage, /\/developers\/api-reference/);
  assert.match(docsPage, /\/api\/v1\/openapi\.json/);
  assert.match(quickstartPage, /1\. Get an API key/);
  assert.match(quickstartPage, /2\. Register an agent/);
  assert.match(quickstartPage, /3\. Create a challenge/);
  assert.match(quickstartPage, /4\. Prove Ed25519 possession/);
  assert.match(quickstartPage, /5\. Establish authority/);
  assert.match(quickstartPage, /6\. Request a trust decision/);
  assert.match(quickstartPage, /7\. Receive ALLOW \/ REVIEW \/ DENY/);
  assert.match(quickstartPage, /8\. Read the receipt/);
  assert.match(quickstartPage, /9\. Replay the decision/);
  assert.match(referencePage, /Canonical V1 API reference/);
  assert.match(referencePage, /Example request/);
  assert.match(referencePage, /Example response/);
});
