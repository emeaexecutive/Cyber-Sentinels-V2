import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertDraftMetadataMatchesQueue,
  parseFrontmatter,
} from "./frontmatter.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const queuePath = resolve(repositoryRoot, "docs/gtm/editorial-queue.json");
const queue = JSON.parse(readFileSync(queuePath, "utf8"));
const expectedAgents = new Map([
  ["market-intelligence.agent.md", ["read", "search", "web"]],
  ["technical-seo.agent.md", ["read", "search", "web"]],
  ["geo-discovery.agent.md", ["read", "search", "web"]],
  ["editorial.agent.md", ["read", "search"]],
  ["distribution.agent.md", ["read", "search"]],
  ["analytics.agent.md", ["read", "search", "web"]],
]);

assert.equal(queue.version, 1, "Unsupported editorial queue version");
assert.match(queue.updated_at, /^\d{4}-\d{2}-\d{2}$/, "Queue date must be ISO formatted");
assert.equal(
  new Date(`${queue.updated_at}T00:00:00Z`).toISOString().slice(0, 10),
  queue.updated_at,
  "Queue date must be a valid calendar date",
);
assert.deepEqual(queue.controls, {
  external_spend_usd: 0,
  external_posting_authorized: false,
  indexing_requests_authorized: false,
  founder_approval_required: true,
});
assert.equal(queue.items.length, 8, "Initial content cluster must contain eight drafts");

const routeSource = readFileSync(
  resolve(repositoryRoot, "lib/navigation/route-visibility.ts"),
  "utf8",
);
const routeBlock = routeSource.match(/canonicalPublicRoutes\s*=\s*\[([\s\S]*?)\]\s*(?:as const)?\s*;/);
assert.ok(routeBlock, "Canonical public route list was not found");
const canonicalRoutes = new Set(
  [...routeBlock[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]),
);
const contentIds = new Set();

for (const item of queue.items) {
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `Invalid content id: ${item.id}`);
  assert.equal(contentIds.has(item.id), false, `Duplicate content id: ${item.id}`);
  contentIds.add(item.id);
  assert.ok(item.question.trim().endsWith("?"), `${item.id} must have one reader question`);
  assert.ok(item.title.length > 0 && item.title.length <= 70, `${item.id} title length is invalid`);
  assert.ok(
    item.meta_description.length >= 80 && item.meta_description.length <= 160,
    `${item.id} meta description must be 80–160 characters`,
  );
  assert.ok(
    ["founder-review", "founder-approved"].includes(item.publication_status),
    `${item.id} has an invalid prepublication status`,
  );
  assert.equal(item.founder_approval_required, true, `${item.id} requires founder approval`);
  assert.equal(item.published, false, `${item.id} must not be published`);
  assert.ok(item.founder_approval, `${item.id} needs an approval record`);
  if (item.publication_status === "founder-review") {
    assert.deepEqual(
      item.founder_approval,
      { by: null, at: null, reference: null },
      `${item.id} must not imply an unrecorded approval`,
    );
  } else {
    assert.ok(item.founder_approval.by?.trim(), `${item.id} approval needs an approver`);
    assert.match(item.founder_approval.at ?? "", /^\d{4}-\d{2}-\d{2}$/, `${item.id} approval date is invalid`);
    assert.equal(
      new Date(`${item.founder_approval.at}T00:00:00Z`).toISOString().slice(0, 10),
      item.founder_approval.at,
      `${item.id} approval date must be valid`,
    );
    assert.ok(item.founder_approval.reference?.trim(), `${item.id} approval needs an auditable reference`);
  }
  assert.ok(
    item.draft_path.startsWith("docs/gtm/drafts/"),
    `${item.id} draft must remain outside public routes`,
  );

  const draftPath = resolve(repositoryRoot, item.draft_path);
  const relativeDraftPath = relative(resolve(repositoryRoot, "docs/gtm/drafts"), draftPath);
  assert.ok(
    relativeDraftPath &&
      relativeDraftPath !== ".." &&
      !relativeDraftPath.startsWith(`..${sep}`) &&
      !isAbsolute(relativeDraftPath) &&
      draftPath.endsWith(".md"),
    `${item.id} draft must remain a Markdown file under docs/gtm/drafts`,
  );
  assert.ok(existsSync(draftPath), `${item.id} draft does not exist`);
  const draft = readFileSync(draftPath, "utf8");
  const { metadata, body } = parseFrontmatter(draft, item.draft_path);
  assertDraftMetadataMatchesQueue(metadata, item);
  assert.match(draft, /^# /m, `${item.id} draft needs a heading`);
  assert.match(draft, /Publication status: Founder review required — not published\./);
  const wordCount = body.match(/[\p{L}\p{N}’'-]+/gu)?.length ?? 0;
  assert.ok(
    wordCount >= 220 && wordCount <= 550,
    `${item.id} draft must contain 220–550 words; found ${wordCount}`,
  );

  assert.ok(item.internal_links.length > 0, `${item.id} needs internal links`);
  for (const link of item.internal_links) {
    assert.match(link, /^\/(?!\/)/, `${item.id} has a non-local link: ${link}`);
    const route = link.split("#", 1)[0];
    assert.ok(canonicalRoutes.has(route), `${item.id} links to noncanonical route: ${route}`);
  }
}

const agentDirectory = resolve(repositoryRoot, ".github/agents");
for (const [filename, expectedTools] of expectedAgents) {
  const agentPath = resolve(agentDirectory, filename);
  assert.ok(existsSync(agentPath), `Missing GTM agent: ${filename}`);
  const agent = readFileSync(agentPath, "utf8");
  const frontmatter = agent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(frontmatter, `${filename} needs YAML frontmatter`);
  const toolsLine = frontmatter[1].match(/^tools:\s*\[([^\]]*)\]$/m);
  assert.ok(toolsLine, `${filename} must declare a bounded tool allowlist`);
  const tools = toolsLine[1]
    .split(",")
    .map((tool) => tool.trim().replace(/^['"]|['"]$/g, ""));
  assert.deepEqual(tools, expectedTools, `${filename} tool allowlist changed`);
  assert.doesNotMatch(toolsLine[1], /\*|execute|edit|agent|github|mcp/i);
  assert.match(agent, /External spend cap: USD 0 per run\./);
  assert.match(agent, /Founder approval is required|Founder approval required/);
}

console.log(
  `GTM workflow validated: ${queue.items.length} unpublished drafts, ${expectedAgents.size} restricted agents, USD 0 external spend.`,
);
