import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createPublicKey, verify } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import test from "node:test";

import { canonicalize } from "../src/lib/trust-core/canonicalize.ts";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "examples", "powershell", "agent-gamma.ps1");
const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";
const available = !spawnSync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "exit 0"]).error;
const apiKey = `cs_test_abcdefghijkl.${"a".repeat(43)}`;

function runPowerShell(environment = {}, arguments_ = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(powershell, [
      "-NoLogo", "-NoProfile", "-NonInteractive",
      ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
      "-File", script, ...arguments_,
    ], {
      cwd: root,
      env: {
        ...process.env,
        CYBER_SENTINELS_BASE_URL: "",
        CYBER_SENTINELS_API_KEY: "",
        VERCEL_AUTOMATION_BYPASS_SECRET: "",
        VERCEL_PROTECTION_BYPASS: "",
        ...environment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; if (stdout.length > 100_000) child.kill(); });
    child.stderr.on("data", (chunk) => { stderr += chunk; if (stderr.length > 100_000) child.kill(); });
    child.once("error", reject);
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

async function withServer(responder, operation) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    request.body = body;
    requests.push({ method: request.method, url: request.url, headers: request.headers, body });
    responder(request, response, requests);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    return await operation({ baseUrl: `http://127.0.0.1:${address.port}`, requests });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function openApi(response) {
  response.writeHead(200, {
    "content-type": "application/json",
    "x-cyber-sentinels-api-version": "2026-08-10",
  });
  response.end(JSON.stringify({ openapi: "3.1.0", info: { title: "Cyber Sentinels External Agent Trust API" } }));
}

function safeError(response, status, code) {
  response.writeHead(status, { "content-type": "application/json", "x-correlation-id": "11111111-1111-4111-8111-111111111111" });
  response.end(JSON.stringify({ error: { code, message: "Safe qualification failure.", correlation_id: "11111111-1111-4111-8111-111111111111" } }));
}

test("PowerShell prerequisites fail before all network access and never print the API key", { skip: !available }, async (t) => {
  const cases = [
    [{ CYBER_SENTINELS_API_KEY: apiKey }, "CYBER_SENTINELS_BASE_URL is not set"],
    [{ CYBER_SENTINELS_BASE_URL: "https://preview.example" }, "CYBER_SENTINELS_API_KEY is not set"],
    [{ CYBER_SENTINELS_BASE_URL: "not a url", CYBER_SENTINELS_API_KEY: apiKey }, "not a valid absolute URL"],
    [{ CYBER_SENTINELS_BASE_URL: "http://preview.example", CYBER_SENTINELS_API_KEY: apiKey }, "must use HTTPS"],
    [{ CYBER_SENTINELS_BASE_URL: "https://cybersentinels.com", CYBER_SENTINELS_API_KEY: apiKey }, "Production Cyber Sentinels domains are refused"],
    [{ CYBER_SENTINELS_BASE_URL: "https://preview.example", CYBER_SENTINELS_API_KEY: "cs_test_invalid" }, "not structurally valid"],
    [{ CYBER_SENTINELS_BASE_URL: "https://preview.example", CYBER_SENTINELS_API_KEY: `cs_live_abcdefghijkl.${"a".repeat(43)}` }, "Production/live API keys are refused"],
  ];
  for (const [environment, expected] of cases) {
    await t.test(expected, async () => {
      const result = await runPowerShell(environment);
      assert.equal(result.code, 1);
      assert.match(result.stderr, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(result.stderr, /\/api\/v1\/agents/);
    });
  }
});

test("PowerShell detects Vercel SSO before registration and sends no API key to the login boundary", { skip: !available }, async () => {
  await withServer((_request, response) => {
    response.writeHead(302, { location: "https://vercel.com/sso-api?url=preview&nonce=redacted", "content-type": "text/plain" });
    response.end("Redirecting");
  }, async ({ baseUrl, requests }) => {
    const result = await runPowerShell({ CYBER_SENTINELS_BASE_URL: baseUrl, CYBER_SENTINELS_API_KEY: apiKey }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Vercel Authentication\/SSO blocks this endpoint/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/v1/openapi.json");
    assert.equal(requests[0].headers.authorization, undefined);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });
});

test("PowerShell reports a wrong Vercel automation bypass as protection blocked", { skip: !available }, async () => {
  const wrongBypass = "vercel-automation-wrong-test-value";
  await withServer((_request, response) => {
    response.writeHead(302, { location: "https://vercel.com/sso-api?url=preview&nonce=redacted", "content-type": "text/plain" });
    response.end("Redirecting");
  }, async ({ baseUrl, requests }) => {
    const result = await runPowerShell({
      CYBER_SENTINELS_BASE_URL: baseUrl,
      CYBER_SENTINELS_API_KEY: apiKey,
      VERCEL_AUTOMATION_BYPASS_SECRET: wrongBypass,
    }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Vercel Authentication\/SSO blocks this endpoint/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].headers["x-vercel-protection-bypass"], wrongBypass);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(wrongBypass));
  });
});

for (const [status, code, expected] of [
  [401, "API_KEY_INVALID", /API key was rejected/],
  [401, "API_KEY_REVOKED", /API key was rejected/],
  [401, "API_KEY_EXPIRED", /API key was rejected/],
  [403, "INSUFFICIENT_SCOPE", /lacks authority:read/],
]) {
  test(`PowerShell preflight stops on ${code} without registration`, { skip: !available }, async () => {
    await withServer((request, response) => {
      if (request.url === "/api/v1/openapi.json") return openApi(response);
      return safeError(response, status, code);
    }, async ({ baseUrl, requests }) => {
      const result = await runPowerShell({ CYBER_SENTINELS_BASE_URL: baseUrl, CYBER_SENTINELS_API_KEY: apiKey }, ["-AllowInsecureLocalhost"]);
      assert.equal(result.code, 1);
      assert.match(result.stderr, expected);
      assert.equal(requests.length, 2);
      assert.equal(requests[1].url, "/api/v1/agents/preflight-probe/authority");
      assert.equal(requests.some((request) => request.method === "POST"), false);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  });
}

test("PowerShell refuses an empty AgentId without constructing /agents//", { skip: !available }, async () => {
  await withServer((request, response) => {
    if (request.url === "/api/v1/openapi.json") return openApi(response);
    if (request.url === "/api/v1/agents/preflight-probe/authority") return safeError(response, 404, "AGENT_NOT_OWNED");
    if (request.url === "/api/v1/agents" && request.method === "POST") {
      response.writeHead(201, { "content-type": "application/json" });
      return response.end(JSON.stringify({ agent_id: "", operational_entity_id: "", status: "PENDING_IDENTITY_PROOF" }));
    }
    return safeError(response, 500, "UNEXPECTED_REQUEST");
  }, async ({ baseUrl, requests }) => {
    const result = await runPowerShell({ CYBER_SENTINELS_BASE_URL: baseUrl, CYBER_SENTINELS_API_KEY: apiKey }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /AgentId is empty/);
    assert.equal(requests.length, 3);
    assert.equal(requests.some((request) => request.url.includes("/agents//")), false);
  });
});

test("PowerShell executes the OpenAPI journey and produces valid external Ed25519 signatures", { skip: !available }, async () => {
  const agentId = "agent:11111111-1111-4111-8111-111111111111";
  const enterpriseId = "22222222-2222-4222-8222-222222222222";
  const credentialId = "credential:33333333-3333-4333-8333-333333333333";
  const transactionId = "44444444-4444-4444-8444-444444444444";
  const authorityId = "88888888-8888-4888-8888-888888888888";
  const reviewReference = "99999999-9999-4999-8999-999999999999";
  const reviewTransactionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const postReviewTransactionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const postRevocationTransactionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const challengeId = "challenge:55555555-5555-4555-8555-555555555555";
  const nonce = "b".repeat(43);
  const manifestDigest = "c".repeat(64);
  let kid = "";
  let publicKey;
  let proofSubmissions = 0;
  let allowRequests = 0;
  let authorityRevoked = false;
  const automationBypass = "vercel-automation-valid-test-value";

  await withServer((request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json", "x-cyber-sentinels-api-version": "2026-08-10", "x-correlation-id": "77777777-7777-4777-8777-777777777777" });
      response.end(JSON.stringify(body));
    };
    if (request.url === "/api/v1/openapi.json") return openApi(response);
    if (request.url === "/api/v1/agents/preflight-probe/authority") return safeError(response, 404, "AGENT_NOT_OWNED");
    if (request.url === "/api/v1/agents" && request.method === "POST") {
      return send(201, {
        agent_id: agentId, operational_entity_id: agentId, status: "PENDING_IDENTITY_PROOF",
        manifest_context: { enterprise_id: enterpriseId, accountable_owner_id: "owner:gamma-customer" },
      });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}` && request.method === "GET") {
      return send(200, { agent_id: agentId, operational_entity_id: agentId, authority_reference: "authority:gamma", authority_status: "ACTIVE" });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/credentials`) {
      const body = JSON.parse(request.body);
      kid = body.kid;
      publicKey = createPublicKey({ key: body.public_jwk, format: "jwk" });
      assert.equal(body.public_jwk.d, undefined);
      return send(201, { credential_id: credentialId, fingerprint: "d".repeat(64), private_key_stored: false });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/manifest`) {
      const body = JSON.parse(request.body);
      const { signature, ...claims } = body;
      assert.equal(verify(null, Buffer.from(canonicalize(claims)), publicKey, Buffer.from(signature, "base64url")), true);
      return send(201, { manifest_id: "manifest:gamma", manifest_digest: manifestDigest });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/challenge`) {
      return send(201, {
        challenge_id: challengeId, nonce, audience: "http://127.0.0.1", issuer: "cyber-sentinels",
        subject: agentId, operational_entity_id: agentId, manifest_digest: manifestDigest, signing_key_id: kid,
        issued_at: "2026-08-11T12:00:00.000Z", expires_at: "2026-08-11T12:05:00.000Z",
      });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/proof`) {
      proofSubmissions += 1;
      if (proofSubmissions > 1) return safeError(response, 409, "CHALLENGE_REPLAYED");
      const body = JSON.parse(request.body);
      const signed = {
        challengeId,
        enterpriseId,
        operationalEntityId: agentId,
        nonce,
        audience: "http://127.0.0.1",
        issuer: "cyber-sentinels",
        subject: agentId,
        manifestDigest,
        signingKeyId: kid,
        issuedAt: "2026-08-11T12:00:00.000Z",
        expiresAt: "2026-08-11T12:05:00.000Z",
      };
      assert.equal(verify(null, Buffer.from(canonicalize(signed)), publicKey, Buffer.from(body.signature, "base64url")), true);
      return send(200, { identity: "VERIFIED", trust: "NOT_DETERMINED_BY_IDENTITY", reason_codes: ["NATIVE_SIGNATURE_VERIFIED"] });
    }
    const authorityPath = `/api/v1/agents/${encodeURIComponent(agentId)}/authorities`;
    if (request.url === authorityPath && request.method === "POST") {
      return send(201, { authority_id: authorityId, authority_reference: authorityId, authority_version: `customer-authority:${authorityId}`, status: "ACTIVE" });
    }
    if (request.url === authorityPath && request.method === "GET") {
      return send(200, { authorities: [{ authority_id: authorityId, authority_version: `customer-authority:${authorityId}`, status: authorityRevoked ? "REVOKED" : "ACTIVE" }] });
    }
    if (request.url === `${authorityPath}/${authorityId}` && request.method === "GET") {
      return send(200, { authority_id: authorityId, authority_reference: authorityId, authority_version: `customer-authority:${authorityId}`, status: authorityRevoked ? "REVOKED" : "ACTIVE" });
    }
    if (request.url === `${authorityPath}/${authorityId}/revoke` && request.method === "POST") {
      authorityRevoked = true;
      return send(200, { authority_id: authorityId, authority_reference: authorityId, status: "REVOKED", revocation_reference: `authority-revocation:${authorityId}` });
    }
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/authority`) {
      return send(200, { operational_entity_id: agentId, status: authorityRevoked ? "REVOKED" : "ACTIVE", actions: ["read_repository"], targets: ["repository:a"] });
    }
    if (request.url === `/api/v1/reviews/${reviewReference}` && request.method === "GET") {
      return send(200, { review_reference: reviewReference, status: "REQUESTED", disposition: null, original_decision: "REVIEW", original_transaction_id: reviewTransactionId, next_action: "WAIT_FOR_AUTHORIZED_REVIEWER" });
    }
    if (request.url === `/api/v1/reviews/${reviewReference}/resolve` && request.method === "POST") {
      return send(200, { review_reference: reviewReference, status: "APPROVED", disposition: "APPROVED", original_decision: "REVIEW", original_transaction_id: reviewTransactionId, next_action: "SUBMIT_NEW_CANONICAL_EVALUATION" });
    }
    if (request.url === "/api/v1/trust/decisions") {
      const body = JSON.parse(request.body);
      if (body.action.type === "read_repository") {
        if (authorityRevoked) return send(201, { transaction_id: postRevocationTransactionId, receipt_id: postRevocationTransactionId, replay_id: postRevocationTransactionId, decision: "DENY", reason_codes: ["AUTHORITY_REVOKED"], execution_authorization: null, idempotent_replay: false });
        if (body.context?.material_changes) return send(201, { transaction_id: reviewTransactionId, review_reference: reviewReference, decision: "REVIEW", reason_codes: ["CLIENT_ASSERTED_MATERIAL_CHANGE"], execution_authorization: null, idempotent_replay: false });
        if (body.context?.human_approval_reference) return send(201, { transaction_id: postReviewTransactionId, decision: "ALLOW", reason_codes: ["HUMAN_APPROVAL_CURRENT"], execution_authorization: { transaction_id: postReviewTransactionId }, idempotent_replay: false });
        allowRequests += 1;
        return send(allowRequests === 1 ? 201 : 200, {
          transaction_id: transactionId, decision: "ALLOW", reason_codes: ["ACTION_AUTHORIZED"],
          execution_authorization: { transaction_id: transactionId }, idempotent_replay: allowRequests > 1,
        });
      }
      return send(201, { transaction_id: "66666666-6666-4666-8666-666666666666", decision: "DENY", reason_codes: ["ACTION_OUT_OF_DELEGATED_SCOPE"], execution_authorization: null, idempotent_replay: false });
    }
    if (request.url === `/api/v1/trust/transactions/${transactionId}`) return send(200, { transaction_id: transactionId, decision: "ALLOW" });
    if (request.url === `/api/v1/trust/transactions/${transactionId}/replay`) return send(200, { transaction_id: transactionId, events: [{ type: "DECISION_RECORDED" }] });
    if (request.url === `/api/v1/trust/transactions/${transactionId}/receipt`) return send(200, { receipt_version: "1.0", decision_digest: "e".repeat(64) });
    if (request.url === `/api/v1/trust/transactions/${postRevocationTransactionId}/receipt`) return send(200, { receipt_id: postRevocationTransactionId, receipt_version: "1.0", decision_digest: "f".repeat(64) });
    if (request.url === `/api/v1/trust/transactions/${postRevocationTransactionId}/replay`) return send(200, { replay_id: postRevocationTransactionId, transaction_id: postRevocationTransactionId, events: [{ type: "DECISION_RECORDED" }] });
    if (request.url === `/api/v1/agents/${encodeURIComponent(agentId)}/trust-state`) return send(200, { operational_entity_id: agentId, identity: "VERIFIED" });
    if (request.url === `/api/v1/trust/transactions/${transactionId}/outcomes`) return send(201, { status: "RECORDED", evidence_independence: "AGENT_ASSERTED", independent_destination_evidence: false });
    return safeError(response, 500, "UNEXPECTED_REQUEST");
  }, async ({ baseUrl, requests }) => {
    const result = await runPowerShell({ CYBER_SENTINELS_BASE_URL: baseUrl, CYBER_SENTINELS_API_KEY: apiKey, VERCEL_AUTOMATION_BYPASS_SECRET: automationBypass }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
    for (const marker of ["PREFLIGHT", "REGISTERED", "CREDENTIAL", "MANIFEST", "IDENTITY", "CHALLENGE_REPLAY", "AUTHORITY", "ALLOW", "IDEMPOTENCY", "REVIEW", "POST_REVIEW_ALLOW", "DENY", "TRANSACTION", "REPLAY", "RECEIPT", "TRUST_STATE", "OUTCOME", "REVOCATION", "POST_REVOCATION_DENY", "GAMMA_RESULT"]) {
      assert.match(result.stdout, new RegExp(`^${marker}:`, "m"));
    }
    assert.equal(requests.some((request) => request.url.includes("/agents//")), false);
    assert.equal(requests.every((request) => request.headers["x-vercel-protection-bypass"] === automationBypass), true);
    assert.equal(requests.filter((request) => request.url !== "/api/v1/openapi.json").every((request) => request.headers.authorization === `Bearer ${apiKey}`), true);
    assert.equal(requests.every((request) => !request.body.includes(apiKey)), true);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(apiKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(automationBypass));
    assert.match(result.stdout, /"correlation_id":"77777777-7777-4777-8777-777777777777"/);
  });
});
