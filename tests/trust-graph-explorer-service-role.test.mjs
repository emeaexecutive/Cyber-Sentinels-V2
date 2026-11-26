import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("admin trust graph metrics use privileged access only after the admin guard", () => {
  const source = readFileSync(new URL("../app/trust-graph-explorer/page.tsx", import.meta.url), "utf8");
  const liveCount = source.match(/async function liveCount[\s\S]*?\n}/)?.[0];
  assert.ok(liveCount, "liveCount helper exists");
  assert.match(liveCount, /createServiceRoleClient\(\)/);
  assert.doesNotMatch(liveCount, /createClient\(\)/);
  const page = source.slice(source.indexOf("export default async function TrustGraphExplorerPage"));
  assert.ok(
    page.indexOf("await requireAdminPageAccess") < page.indexOf("const supabase = createServiceRoleClient()"),
    "service-role reads must follow the admin guard",
  );
});
