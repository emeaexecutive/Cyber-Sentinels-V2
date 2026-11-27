import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { importJWK, SignJWT } from "jose";

import { createWorkloadTokenVerifier, workloadIdentityConfig } from "../lib/public-api/v1/workload-token.ts";
import { PUBLIC_V1_ROUTE_CONTRACT } from "../lib/public-api/v1/contracts.ts";

const issuer = "https://workload-issuer.example.test/oidc/";
const audience = "https://api.example.test/workload";
const jwksUrl = "https://workload-issuer.example.test/oidc/keys";
const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const workloadId = "agent:customer:alpha";
const subject = "customer-workload-123";
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateJwk = { ...privateKey.export({ format: "jwk" }), alg: "EdDSA", kid: "issuer-key-1", use: "sig" };
const publicJwk = { ...publicKey.export({ format: "jwk" }), alg: "EdDSA", kid: "issuer-key-1", use: "sig" };
const importedPrivateKey = await importJWK(privateJwk, "EdDSA");
const jwksBody = JSON.stringify({ keys: [publicJwk] });
const config = { issuer, audience, jwksUrl };

async function token(options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    tenant_id: tenantId,
    workload_id: workloadId,
    scope: "trust:request",
    ...options.claims,
  };
  return new SignJWT(claims)
    .setProtectedHeader({ alg: options.alg ?? "EdDSA", kid: "issuer-key-1", typ: "JWT" })
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? audience)
    .setSubject(options.subject ?? subject)
    .setJti(options.jti ?? "token-id-1234567890")
    .setIssuedAt(options.issuedAt ?? now)
    .setExpirationTime(options.expiration ?? now + 120)
    .sign(options.signingKey ?? (options.alg === "HS256"
      ? new TextEncoder().encode("non-production-test-signing-key")
      : importedPrivateKey));
}

function verifier(fetcher = async (input, init) => {
  assert.equal(String(input), jwksUrl);
  assert.equal(init.redirect, "error");
  return new Response(jwksBody, { status: 200, headers: { "content-type": "application/json" } });
}) {
  return createWorkloadTokenVerifier(config, fetcher);
}

test("workload token verification pins issuer, audience, algorithms and HTTPS JWKS", async () => {
  let jwksRequests = 0;
  const verify = verifier(async (input, init) => {
    jwksRequests++;
    assert.equal(String(input), jwksUrl);
    assert.equal(init.redirect, "error");
    return new Response(jwksBody, { status: 200, headers: { "content-type": "application/json" } });
  });
  const claims = await verify(await token());
  assert.deepEqual(claims, {
    issuer,
    subject,
    tenantId,
    workloadId,
    tokenId: "token-id-1234567890",
    scopes: ["trust:request"],
  });
  assert.equal(jwksRequests, 1);
});

test("invalid signature, issuer, audience, expiry and missing bound claims fail closed", async () => {
  const verify = verifier();
  const otherPrivateKey = await importJWK({
    ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }),
    alg: "EdDSA",
  }, "EdDSA");
  await assert.rejects(verify(await token({ signingKey: otherPrivateKey })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ alg: "HS256" })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ claims: { tenant_id: "not-a-tenant" } })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ claims: { workload_id: undefined } })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ claims: { scope: "trust:request admin" } })), { code: "WORKLOAD_SCOPE_DENIED" });
  await assert.rejects(verify(await token({ issuer: "https://attacker.example.test" })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ audience: "https://attacker.example.test" })), { code: "WORKLOAD_TOKEN_INVALID" });
  const now = Math.floor(Date.now() / 1000);
  await assert.rejects(verify(await token({ issuedAt: now - 60, expiration: now - 20 })), { code: "WORKLOAD_TOKEN_INVALID" });
});

test("workload tokens are short-lived and require unique token identifiers", async () => {
  const verify = verifier();
  const now = Math.floor(Date.now() / 1000);
  await assert.rejects(verify(await token({ issuedAt: now, expiration: now + 600 })), { code: "WORKLOAD_TOKEN_INVALID" });
  await assert.rejects(verify(await token({ jti: "" })), { code: "WORKLOAD_TOKEN_INVALID" });
});

test("issuer and JWKS configuration cannot be supplied by an incoming token", async () => {
  assert.deepEqual(workloadIdentityConfig({
    WORKLOAD_OIDC_ISSUER: issuer,
    WORKLOAD_OIDC_AUDIENCE: audience,
    WORKLOAD_OIDC_JWKS_URL: jwksUrl,
  }), config);
  for (const env of [
    { WORKLOAD_OIDC_ISSUER: "http://issuer.example.test", WORKLOAD_OIDC_AUDIENCE: audience, WORKLOAD_OIDC_JWKS_URL: jwksUrl },
    { WORKLOAD_OIDC_ISSUER: issuer, WORKLOAD_OIDC_AUDIENCE: audience, WORKLOAD_OIDC_JWKS_URL: "https://user:pass@issuer.example.test/keys" },
    { WORKLOAD_OIDC_ISSUER: issuer, WORKLOAD_OIDC_AUDIENCE: audience, WORKLOAD_OIDC_JWKS_URL: jwksUrl, ISSUER: "https://attacker.example.test" },
  ]) {
    if (env.WORKLOAD_OIDC_ISSUER === issuer && env.WORKLOAD_OIDC_JWKS_URL === jwksUrl) {
      assert.equal(workloadIdentityConfig(env).issuer, issuer);
    } else {
      assert.throws(() => workloadIdentityConfig(env), { code: "WORKLOAD_IDENTITY_CONFIGURATION_INVALID" });
    }
  }
});

test("JWKS service failures fail closed as an availability error", async () => {
  const verify = verifier(async () => {
    throw new Error("simulated issuer outage");
  });
  await assert.rejects(verify(await token()), { code: "WORKLOAD_IDENTITY_UNAVAILABLE" });
});

test("workload binding routes use the existing registry and decision contracts", async () => {
  for (const route of [
    "get /api/v1/agents/{agentId}/workload-bindings",
    "post /api/v1/agents/{agentId}/workload-bindings",
    "post /api/v1/agents/{agentId}/workload-bindings/{bindingId}/revoke",
    "post /api/v1/workloads/{agentId}/decisions",
  ]) {
    assert.ok(PUBLIC_V1_ROUTE_CONTRACT.some(([method, path]) => `${method} ${path}` === route), route);
  }
  const auth = await readFile(new URL("../lib/public-api/v1/workload-identity.ts", import.meta.url), "utf8");
  assert.match(auth, /\.eq\("tenant_id", claims\.tenantId\)/);
  assert.match(auth, /\.eq\("operational_entity_id", claims\.workloadId\)/);
  assert.match(auth, /\.eq\("issuer", claims\.issuer\)/);
  assert.match(auth, /\.eq\("subject", claims\.subject\)/);
  assert.match(auth, /binding\.status !== "active"/);
  assert.match(auth, /\.eq\("workspace_id", claims\.tenantId\)/);
  assert.match(auth, /!\["owner", "admin"\]\.includes\(role\)/);
  const routeSource = await readFile(new URL("../app/api/v1/workloads/[agentId]/decisions/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /operational_entity_id: boundAgentId/);
  assert.match(routeSource, /Object\.hasOwn\(body, "operational_entity_id"\)/);
});

test("workload bindings are tenant-bound and inaccessible to client database roles", async () => {
  const migration = await readFile(
    new URL("../supabase/migrations/20261104150000_workload_identity_bindings.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /foreign key\(tenant_id,operational_entity_id\)\s+references public\.public_api_agent_bindings\(tenant_id,operational_entity_id\)/i);
  assert.match(migration, /check\(scopes = array\['trust:request'\]::text\[\]\)/i);
  assert.match(migration, /alter table public\.public_api_workload_bindings enable row level security/i);
  assert.match(migration, /revoke all on table public\.public_api_workload_bindings from public,anon,authenticated/i);
  assert.match(migration, /grant select,insert,update on table public\.public_api_workload_bindings to service_role/i);
});
