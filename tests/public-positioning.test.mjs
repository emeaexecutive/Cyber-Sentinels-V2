import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const publicPositioningPages = ["app/page.tsx", "app/investor/page.tsx"];

const capabilityNames = [
  "Operational Trust Intelligence™",
  "Trust Narrative™",
  "Trust Recommendation™",
  "Trust Explanation™",
  "Trust Prediction™",
  "Trust Advisor™",
  "Trust Health™",
  "Trust Drift™",
  "Trust Stability™",
  "Trust Confidence™",
  "Trust Recovery™",
  "Trust Continuity™",
  "Trust Memory™",
  "Authority Lineage™",
  "Replay™",
];

async function pathExists(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test("homepage uses the approved category, supporting statement and restrained calls to action", async () => {
  const home = await read("app/page.tsx");

  assert.match(home, /Before an AI agent acts, prove it has the authority to do so\./);
  assert.match(
    home,
    /Cyber Sentinels checks who or what is acting, what it is trying to do, and whether it has authority under the current policy\./,
  );
  assert.match(home, /Every decision keeps the evidence needed for audit and Replay\./);
  assert.match(home, /Request a demo/);
  assert.match(home, /Explore the API/);
});

test("public capability vocabulary is grouped into no more than four themes", async () => {
  const home = await read("app/page.tsx");
  const contextMatches = home.match(/title: "(?:AI agent|Data|Infrastructure|Human)"/g) ?? [];

  assert.equal(contextMatches.length, 4);
  for (const description of [
    "Can this agent approve this €20,000 payment?",
    "Can this agent export these customer records?",
    "Can this agent change this Production configuration?",
    "Can this person approve this action for this organisation?",
  ]) {
    assert.match(home, new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(home, /machine learning|predictive certainty/i);
});

test("investor page uses approved restrained positioning and interest wording", async () => {
  const investor = await read("app/investor/page.tsx");

  assert.match(investor, /Cyber Sentinels is building infrastructure for a world in which people, AI agents and automated workflows/);
  assert.match(investor, /The opportunity is not another alerting product\./);
  assert.match(investor, /independent operational trust layer connecting[\s\S]*identity, authority, evidence, decisions and outcomes/);
  assert.match(investor, /Design-partner and early-investor conversations are now open\./);
  assert.match(investor, /Join the design-partner programme/);
  assert.match(investor, /Request an enterprise conversation/);
  assert.doesNotMatch(investor, /EvidenceDisclaimer/);
});

test("public positioning pages contain no blueprint disclosures or blueprint calls to action", async () => {
  const forbidden = [
    ["internal architecture document name", /TRUST-(?:STATE|GRAPH|API|ALGORITHM)|system-overview\.md|service-layer\.md/i],
    ["work-item number", /\b(?:EPIC|SPRINT)[-_ ]?\d/i],
    ["migration path", /supabase[\\/]migrations|migrations?[\\/]\d/i],
    ["table or RPC name", /\b(?:rpc\s*\(|[a-z][a-z0-9]*_[a-z0-9_]+\s+table\b)/i],
    ["internal API design", /app[\\/]api|\bAPI (?:contract|design|route)\b/i],
    ["reason-code list", /reason[_ -]?codes?\s*[:=\[]/i],
    ["pseudocode", /\bpseudocode\b|```(?:ts|js|sql|python)/i],
    ["database terminology", /\b(?:database|schema|PostgreSQL|Supabase|SQL query|row-level security)\b/i],
    ["hidden prompt", /\b(?:system prompt|hidden prompt|prompt template)\b/i],
    ["provider credential", /\b(?:api[_ -]?key|client[_ -]?secret|provider credential|access token)\b/i],
    ["internal branch", /\b(?:feature|fix|chore)[\\/][a-z0-9._/-]+/i],
    ["local file path", /[A-Z]:\\|\/Users\/|\/home\//i],
    ["blueprint CTA", /See how it works|Explore the architecture|View the algorithm|Technical blueprint|Product architecture|Full system demonstration/i],
  ];

  for (const path of publicPositioningPages) {
    const source = await read(path);
    for (const [label, pattern] of forbidden) {
      assert.doesNotMatch(source, pattern, `${path} exposes ${label}`);
    }
  }
});

test("public positioning pages avoid unsupported trademark, compliance and product claims", async () => {
  const source = (await Promise.all(publicPositioningPages.map(read))).join("\n");

  assert.doesNotMatch(source, /®/);
  assert.doesNotMatch(source, /\b(?:patented|registered (?:mark|trademark)|legally compliant|regulatory approval|regulator approved)\b/i);
  assert.doesNotMatch(source, /\b(?:production deployed|enterprise-scale proven|continuous live monitoring|autonomous decision making|guaranteed detection|perfect attribution|predictive certainty)\b/i);
});

test("brand vocabulary records every approved capability name and claimed-mark status", async () => {
  const brand = await read("docs/brand/OPERATIONAL_TRUST_CAPABILITY_NAMES.md");

  for (const name of capabilityNames) {
    assert.match(brand, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(brand, /Unregistered claimed mark unless proven otherwise\./);
  assert.doesNotMatch(brand, /®/);
});

test("teaser library contains twelve concise posts and the six-week sequence", async () => {
  const teasers = await read("docs/marketing/OPERATIONAL_TRUST_TEASERS.md");
  const posts = teasers.split(/^### Post \d+[^\r\n]*\r?\n\r?\n/gm).slice(1);

  assert.equal(posts.length, 12);
  for (const [index, post] of posts.entries()) {
    const wordCount = (post.match(/[\p{L}\p{N}’'-]+/gu) ?? []).length;
    assert.ok(wordCount <= 120, `Post ${index + 1} has ${wordCount} words`);

    const namedCapabilities = capabilityNames.filter((name) => post.includes(name));
    assert.ok(namedCapabilities.length <= 1, `Post ${index + 1} names ${namedCapabilities.join(", ")}`);
    assert.match(post, /Cyber Sentinels|Operational Trust Intelligence™|Trust (?:Narrative|Memory|Continuity)™|Authority Lineage™|Replay™/);
  }

  for (const week of ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"]) {
    assert.match(teasers, new RegExp(`\\| ${week} \\|`));
  }
});

test("required no-blueprint documents and truth classification exist", async () => {
  const docs = [
    "docs/marketing/OPERATIONAL_TRUST_TEASERS.md",
    "docs/marketing/NO_BLUEPRINT_PUBLIC_CONTENT_POLICY.md",
    "docs/brand/OPERATIONAL_TRUST_CAPABILITY_NAMES.md",
    "docs/investor/PUBLIC_INVESTOR_POSITIONING.md",
    "docs/CYBER_SENTINELS_CAPABILITY_TRUTH_MATRIX.md",
  ];

  for (const doc of docs) {
    assert.equal(await pathExists(doc), true, `${doc} should exist`);
  }

  const policy = await read("docs/marketing/NO_BLUEPRINT_PUBLIC_CONTENT_POLICY.md");
  for (const classification of ["PUBLIC", "CONTROLLED", "CONFIDENTIAL"]) {
    assert.match(policy, new RegExp(`### ${classification}`));
  }
  assert.equal((policy.match(/^- (?:Does|Could) /gm) ?? []).length, 12);

  const truthMatrix = await read("docs/CYBER_SENTINELS_CAPABILITY_TRUTH_MATRIX.md");
  assert.match(truthMatrix, /## Public positioning claim register/);
  assert.match(truthMatrix, /public capability vocabulary only/i);
});
