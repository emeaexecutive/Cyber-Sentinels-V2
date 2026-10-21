import assert from "node:assert/strict";
import yaml from "js-yaml";

export function parseFrontmatter(markdown, source) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert.ok(frontmatter, `${source} needs YAML frontmatter`);

  let metadata;
  try {
    metadata = yaml.load(frontmatter[1], { filename: source });
  } catch (error) {
    throw new Error(`${source} has malformed YAML frontmatter: ${error.message}`, {
      cause: error,
    });
  }

  assert.ok(
    metadata !== null && typeof metadata === "object" && !Array.isArray(metadata),
    `${source} frontmatter must be a YAML mapping`,
  );

  return { metadata, body: markdown.slice(frontmatter[0].length) };
}

export function assertDraftMetadataMatchesQueue(metadata, item) {
  assert.equal(metadata.title, item.title, `${item.id} draft title mismatch`);
  assert.equal(
    metadata.meta_description,
    item.meta_description,
    `${item.id} draft description mismatch`,
  );
  assert.equal(
    metadata.publication_status,
    item.publication_status,
    `${item.id} draft status mismatch`,
  );
  assert.deepEqual(
    metadata.internal_links,
    item.internal_links,
    `${item.id} draft internal links mismatch`,
  );
}
