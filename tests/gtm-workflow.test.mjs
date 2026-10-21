import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertDraftMetadataMatchesQueue,
  parseFrontmatter,
} from "../scripts/gtm/frontmatter.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const queueItem = {
  id: "test-draft",
  title: "Cyber Sentinels and TENENTE: Our Story",
  meta_description: "An editorial summary that is long enough for the test fixture.",
  publication_status: "founder-review",
  internal_links: ["/about", "/platform"],
};

test("frontmatter parser accepts quoted titles containing a colon", () => {
  const { metadata } = parseFrontmatter(
    [
      "---",
      'title: "Cyber Sentinels and TENENTE: Our Story"',
      'meta_description: "An editorial summary that is long enough for the test fixture."',
      "publication_status: founder-review",
      "internal_links:",
      "  - /about",
      "  - /platform",
      "---",
      "",
      "Draft body.",
    ].join("\n"),
    "test-draft.md",
  );

  assertDraftMetadataMatchesQueue(metadata, queueItem);
});

test("frontmatter parser rejects unquoted titles containing a colon", () => {
  assert.throws(
    () =>
      parseFrontmatter(
        ["---", "title: Cyber Sentinels and TENENTE: Our Story", "---", "Body."].join("\n"),
        "test-draft.md",
      ),
    /malformed YAML frontmatter/,
  );
});

test("frontmatter metadata must match every editorial queue field", () => {
  const metadata = {
    title: queueItem.title,
    meta_description: queueItem.meta_description,
    publication_status: queueItem.publication_status,
    internal_links: [...queueItem.internal_links],
  };

  for (const [field, mismatch] of [
    ["title", "Different title"],
    ["meta_description", "Different description"],
    ["publication_status", "published"],
    ["internal_links", ["/about"]],
  ]) {
    assert.throws(
      () => assertDraftMetadataMatchesQueue({ ...metadata, [field]: mismatch }, queueItem),
      /mismatch/,
      `${field} must match the editorial queue`,
    );
  }
});

test("GTM workflow keeps drafts unpublished and agent tools restricted", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/gtm/validate-workflow.mjs"],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /8 unpublished drafts, 6 restricted agents, USD 0 external spend/);
});
