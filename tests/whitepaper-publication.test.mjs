import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("canonical whitepaper contains the full V1 argument and an honest capability matrix", async () => {
  const source = await read("docs/whitepaper/CYBER_SENTINELS_WHITEPAPER_V1.md");
  assert.match(source, /Operational Trust Infrastructure for Autonomous Systems/);
  assert.match(source, /Technical Whitepaper · Version 1\.0 · September 2026/);
  assert.equal([...source.matchAll(/^## \d+\. /gm)].length, 20);
  for (const marker of [
    "ALLOW", "REVIEW", "DENY", "Ed25519", "Authority Graph", "Evidence Graph",
    "Receipts", "Replay", "Trust Memory", "WORKING", "PARTIAL", "ROADMAP",
    "PREVIOUS_ALLOW != STANDING_AUTHORIZATION",
    "AGENT_ASSERTED != INDEPENDENT_EVIDENCE",
  ]) assert.match(source, new RegExp(marker));
  assert.match(source, /An `ALLOW` decision is authorization[\s\S]{0,240}not proof/i);
  assert.match(source, /World ID \| \*\*ROADMAP\*\*/);
  assert.match(source, /Stripe Identity \| \*\*ROADMAP\*\*/);
});

test("public PDF exists at the stable route and is a substantive PDF", async () => {
  const url = new URL("../public/documents/cyber-sentinels-operational-trust-whitepaper-v1.pdf", import.meta.url);
  const [buffer, details] = await Promise.all([readFile(url), stat(url)]);
  assert.equal(buffer.subarray(0, 5).toString("ascii"), "%PDF-");
  assert.ok(details.size > 100_000, `Expected a designed PDF larger than 100 KB; received ${details.size}.`);
  assert.match(buffer.subarray(-2048).toString("latin1"), /%%EOF/);
});

test("Documents library and HTML reader are public, semantic, responsive and accessible", async () => {
  const [library, reader, layout, visibility] = await Promise.all([
    read("app/documents/page.tsx"),
    read("app/documents/operational-trust-whitepaper/page.tsx"),
    read("app/layout.tsx"),
    read("lib/navigation/route-visibility.ts"),
  ]);
  assert.match(library, /Documents & Technical Resources/);
  assert.match(library, /Technical documentation, product architecture, operational trust research and enterprise evidence/);
  assert.match(library, /Download Cyber Sentinels whitepaper PDF/);
  assert.match(library, /sm:flex-row/);
  assert.match(reader, /<h1/);
  assert.ok((reader.match(/<h2/g) ?? []).length >= 3);
  assert.match(reader, /Cyber Sentinels Operational Trust Whitepaper/);
  assert.match(reader, /alternates: \{ canonical: "\/documents\/operational-trust-whitepaper" \}/);
  assert.doesNotMatch(`${library}\n${reader}`, /noindex|robots:\s*\{[^}]*index:\s*false/i);
  assert.match(layout, /\["\/documents", "Documents"\]/);
  assert.match(visibility, /"\/documents"/);
  assert.match(visibility, /"\/documents\/operational-trust-whitepaper"/);
});

test("download links use the stable PDF path and descriptive labels", async () => {
  const [library, reader] = await Promise.all([
    read("app/documents/page.tsx"),
    read("app/documents/operational-trust-whitepaper/page.tsx"),
  ]);
  const source = `${library}\n${reader}`;
  assert.ok((source.match(/\/documents\/cyber-sentinels-operational-trust-whitepaper-v1\.pdf/g) ?? []).length >= 4);
  assert.ok((source.match(/Download Cyber Sentinels whitepaper PDF/g) ?? []).length >= 3);
  assert.match(source, /Download whitepaper PDF/);
  assert.match(source, /whitespace-normal text-center/);
  assert.doesNotMatch(source, />Download</);
});
