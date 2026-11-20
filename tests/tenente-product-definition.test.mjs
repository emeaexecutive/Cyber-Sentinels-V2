import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const STATEMENT =
  "TENENTE is the product direction within Cyber Sentinels: helping organisations apply current policy and delegated authority to AI agent actions, then preserve evidence of the decision.";
const DEFINITION = "docs/product/TENENTE_PRODUCT_DEFINITION.md";

const separateProduct = [
  /TENENTE\S*\s+(?:is|as)\s+(?:a|an)\s+(?:separate|independent|standalone|new|unrelated)\s+(?:company|product|platform|startup|brand|repository|repo|database)/i,
  /TENENTE\S*\s+(?:replaces|supersedes)\s+Cyber Sentinels/i,
  /(?:separate|independent|standalone|unrelated)\s+TENENTE\S*\s+(?:company|product|platform|repository|repo|database|Supabase|Vercel)/i,
];

test("canonical definition preserves the statement, architecture and boundaries", async () => {
  const doc = await read(DEFINITION);
  assert.ok(doc.includes(STATEMENT));
  assert.ok(
    doc.includes(
      "Identity → Authority → Policy → Runtime Trust Signals → Decision → Execution → Receipt → Replay → Trust Memory™",
    ),
  );
  assert.ok(doc.includes("Built in Aragón. Designed for a world of autonomous agents."));
  assert.ok(doc.includes("Authority can be delegated. It cannot be invented."));
  for (const phrase of [
    "separate company",
    "replacement for Cyber Sentinels",
    "marketing campaign",
    "Supabase project",
    "Vercel project",
    "identity provider",
    "billing system",
    "not Production-qualified",
  ]) {
    assert.ok(doc.includes(phrase), `missing: ${phrase}`);
  }
});

test("public pages use the canonical statement and stay within Cyber Sentinels", async () => {
  const about = (await read("app/about-us/page.tsx")).replace(/\s+/g, " ");
  assert.ok(about.includes(STATEMENT));
  for (const path of ["app/about/page.tsx", "app/about-us/page.tsx", "app/platform/page.tsx"]) {
    const source = await read(path);
    for (const pattern of separateProduct) assert.doesNotMatch(source, pattern, path);
  }
});

test("GTM agents, policy and drafts reference the definition and avoid separate-product wording", async () => {
  assert.match(await read(".github/agents/editorial.agent.md"), /TENENTE_PRODUCT_DEFINITION\.md/);
  assert.match(await read("docs/gtm/OPERATING_POLICY.md"), /TENENTE_PRODUCT_DEFINITION\.md/);

  const files = [
    ...(await readdir(new URL("../.github/agents/", import.meta.url))).map((f) => `.github/agents/${f}`),
    ...(await readdir(new URL("../docs/gtm/drafts/", import.meta.url))).map((f) => `docs/gtm/drafts/${f}`),
    "docs/gtm/distribution-drafts.md",
    "docs/gtm/editorial-queue.json",
  ];
  for (const path of files) {
    const text = await read(path);
    for (const pattern of separateProduct) assert.doesNotMatch(text, pattern, path);
  }
});
