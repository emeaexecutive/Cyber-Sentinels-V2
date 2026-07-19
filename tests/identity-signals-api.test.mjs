import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const verificationRoute = await readFile(new URL("../app/api/identity/verifications/route.ts", import.meta.url), "utf8");
const context = await readFile(new URL("../lib/identity-signals/enterprise-context.ts", import.meta.url), "utf8");
const worldCallback = await readFile(new URL("../app/api/providers/world-id/callback/route.ts", import.meta.url), "utf8");
const hopaeAlias = await readFile(new URL("../app/api/providers/hopae/callback/route.ts", import.meta.url), "utf8");
const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");

test("identity API derives enterprise authority from authenticated membership", () => {
  assert.match(context, /x-enterprise-id/i);
  assert.match(context, /supabase\.auth\.getUser/);
  assert.match(context, /trust_workspaces/);
  assert.match(context, /workspace_members/);
  assert.match(verificationRoute, /enterpriseId must be selected only/);
  assert.match(verificationRoute, /Idempotency-Key/);
});

test("provider callbacks remain fail-closed and canonical", () => {
  assert.match(worldCallback, /WORLD_ID_SERVER_VERIFICATION_NOT_CONNECTED/);
  assert.match(worldCallback, /confidence: 0/);
  assert.match(worldCallback, /serverVerified: false/);
  assert.match(hopaeAlias, /export \{ POST \} from "\.\.\/\.\.\/route"/);
  assert.match(middleware, /\/api\/providers\/hopae\/callback/);
  assert.match(middleware, /\/api\/providers\/world-id\/callback/);
});
