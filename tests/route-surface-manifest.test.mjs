import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("route visibility exports a product-surface manifest for public, authenticated and archived routes", async () => {
  const source = await read("lib/navigation/route-visibility.ts");

  assert.match(source, /export const routeSurfaceManifest/i);
  assert.match(source, /route: "\/"/);
  assert.match(source, /route: "\/platform"/);
  assert.match(source, /route: "\/dashboard"/);
  assert.match(source, /route: "\/admin"/);
  assert.match(source, /route: "\/agent-passport"/);
  assert.match(source, /visibility: "deprecated"/);
  assert.match(source, /visibility: "public"/);
  assert.match(source, /visibility: "authenticated"/);
  assert.match(source, /visibility: "internal"/);
  assert.match(source, /visibility: "archived"/);
});
