import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { installJudgeMeStore } from "../lib/providers/judgeme-installation.ts";

const input = { enterpriseId: "11111111-1111-4111-8111-111111111111", installedBy: "22222222-2222-4222-8222-222222222222", configuredShopDomain: "Demo.MyShopify.com" };
const record = { id: "33333333-3333-4333-8333-333333333333", enterpriseId: input.enterpriseId, shopDomain: "demo.myshopify.com", status: "active" };

function deps(overrides = {}) {
  const calls = [];
  return {
    calls,
    async verifyShop(domain) { calls.push(["verifyShop", domain]); return { shopDomain: domain }; },
    async findInstallation(domain) { calls.push(["findInstallation", domain]); return null; },
    async createInstallation(value) { calls.push(["createInstallation", value]); return record; },
    async registerWebhooks(value) { calls.push(["registerWebhooks", value.id]); },
    ...overrides,
  };
}

test("Judge.me installation maps only an API-verified configured Shopify shop to the authenticated tenant", async () => {
  const services = deps();
  const result = await installJudgeMeStore(input, services);
  assert.deepEqual(result, { installationId: record.id, enterpriseId: input.enterpriseId, shopDomain: record.shopDomain, status: "active" });
  assert.equal(services.calls[0][0], "verifyShop");
  assert.equal(services.calls.some((call) => call[0] === "registerWebhooks"), true);
  assert.equal(JSON.stringify(result).includes("token"), false);
});

test("Judge.me installation refuses forged shop response and cross-tenant shop reassignment", async () => {
  await assert.rejects(installJudgeMeStore(input, deps({ async verifyShop() { return { shopDomain: "other.myshopify.com" }; } })), /JUDGEME_SHOP_AUTHENTICATION_MISMATCH/);
  await assert.rejects(installJudgeMeStore(input, deps({ async findInstallation() { return { ...record, enterpriseId: "44444444-4444-4444-8444-444444444444" }; } })), /JUDGEME_SHOP_ALREADY_BOUND/);
});

test("Judge.me installation never creates callbacks for invalid domains or tenant identities", async () => {
  const services = deps();
  await assert.rejects(installJudgeMeStore({ ...input, configuredShopDomain: "https://demo.myshopify.com" }, services), /JUDGEME_SHOP_DOMAIN_INVALID/);
  await assert.rejects(installJudgeMeStore({ ...input, enterpriseId: "not-a-tenant" }, services), /JUDGEME_INSTALLATION_ACTOR_INVALID/);
  assert.equal(services.calls.length, 0);
});

test("Judge.me installation mapping is shop-unique and service-role only", () => {
  const migration = readFileSync("supabase/migrations/202610020001_judgeme_installations.sql", "utf8");
  assert.match(migration, /create table if not exists public\.judgeme_installations/);
  assert.match(migration, /shop_domain text not null unique/);
  assert.match(migration, /enterprise_id uuid not null references public\.trust_workspaces/);
  assert.match(migration, /alter table public\.judgeme_installations enable row level security/);
  assert.match(migration, /revoke all on public\.judgeme_installations from anon, authenticated/);
});