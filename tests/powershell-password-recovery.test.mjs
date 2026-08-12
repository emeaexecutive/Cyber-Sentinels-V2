import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const script = path.join(root, "examples", "powershell", "password-recovery-proof.ps1");
const powershell = process.platform === "win32" ? "powershell.exe" : "pwsh";
const available = !spawnSync(
  powershell,
  ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", "exit 0"],
).error;
const genericMessage = "If an account exists for that email, we've sent password reset instructions.";
const controlledEmail = "password-proof@controlled.example";

function runPowerShell(environment = {}, arguments_ = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(powershell, [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      ...(process.platform === "win32" ? ["-ExecutionPolicy", "Bypass"] : []),
      "-File",
      script,
      ...arguments_,
    ], {
      cwd: root,
      env: {
        ...process.env,
        CYBER_SENTINELS_BASE_URL: "",
        CYBER_SENTINELS_TEST_EMAIL: "",
        VERCEL_AUTOMATION_BYPASS_SECRET: "",
        ...environment,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill(), 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
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
    requests.push({
      method: request.method,
      url: request.url,
      headers: request.headers,
      body,
    });
    responder(request, response, requests, body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    return await operation({ baseUrl: `http://127.0.0.1:${port}`, requests });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-correlation-id": "11111111-1111-4111-8111-111111111111",
  });
  response.end(JSON.stringify(body));
}

function successfulResponder(options = {}) {
  let acceptedRequests = 0;
  return (request, response, _requests, rawBody) => {
    if (request.url === "/login" && request.method === "GET") {
      response.writeHead(200, { "content-type": "text/html" });
      return response.end("<!doctype html><title>Cyber Sentinels</title>");
    }
    if (request.url !== "/api/auth/password-reset/request" || request.method !== "POST") {
      return sendJson(response, 404, { ok: false, code: "NOT_FOUND" });
    }

    const body = JSON.parse(rawBody);
    if (!body.email.includes("@")) {
      if (options.acceptMalformed) return sendJson(response, 200, { ok: true, message: genericMessage });
      return sendJson(response, 400, { ok: false, code: "INVALID_EMAIL", error: "Enter a valid email address." });
    }
    if (!body.turnstileToken) {
      return sendJson(response, 400, { ok: false, code: "MISSING_TOKEN", error: "Security check failed." });
    }

    acceptedRequests += 1;
    if (options.neverRateLimit !== true && acceptedRequests > 2) {
      return sendJson(response, 429, { ok: false, code: "RATE_LIMITED", error: "Too many attempts." });
    }
    const message = options.enumerates && body.email.includes("password-reset-proof+")
      ? "No account exists."
      : genericMessage;
    return sendJson(response, 200, { ok: true, message });
  };
}

test("PowerShell proof source uses only the product endpoint and documents its boundary", async () => {
  const [source, readme] = await Promise.all([
    readFile(script, "utf8"),
    readFile(path.join(root, "examples", "powershell", "README.md"), "utf8"),
  ]);
  assert.match(source, /\/api\/auth\/password-reset\/request/);
  assert.doesNotMatch(source, /supabase\.co|service[_-]?role|resetPasswordForEmail|updateUser/i);
  assert.doesNotMatch(source, /Invoke-Expression|iex\b/i);
  assert.match(source, /PASSWORD RESET REQUEST WORKING THROUGH CYBER SENTINELS PUBLIC HTTPS ENDPOINT/);
  assert.match(source, /BLOCKED \$\(\[char\]0x2014\)/);
  assert.match(readme, /not full recovery proof/i);
  assert.match(readme, /controlled mailbox and browser/i);
});

test("preflight refuses missing values, malformed URLs, non-HTTPS, and Production", { skip: !available }, async (t) => {
  const cases = [
    [{ CYBER_SENTINELS_TEST_EMAIL: controlledEmail }, /CYBER_SENTINELS_BASE_URL is not set/],
    [{ CYBER_SENTINELS_BASE_URL: "https://preview.vercel.app" }, /CYBER_SENTINELS_TEST_EMAIL is not set/],
    [{ CYBER_SENTINELS_BASE_URL: "not-a-url", CYBER_SENTINELS_TEST_EMAIL: controlledEmail }, /not a valid absolute URL/],
    [{ CYBER_SENTINELS_BASE_URL: "http://preview.vercel.app", CYBER_SENTINELS_TEST_EMAIL: controlledEmail }, /must use HTTPS/],
    [{ CYBER_SENTINELS_BASE_URL: "https://www.cybersentinels.com", CYBER_SENTINELS_TEST_EMAIL: controlledEmail }, /Production Cyber Sentinels domains are refused/],
    [{ CYBER_SENTINELS_BASE_URL: "https://staging.example", CYBER_SENTINELS_TEST_EMAIL: controlledEmail }, /qualified Vercel Preview host/],
  ];
  for (const [environment, expected] of cases) {
    await t.test(expected.source, async () => {
      const result = await runPowerShell(environment);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /^BLOCKED — /m);
      assert.match(result.stderr, expected);
      assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(controlledEmail));
    });
  }
});

test("detects Vercel SSO and never prints an automation bypass", { skip: !available }, async () => {
  const bypass = "vercel-automation-proof-secret";
  await withServer((_request, response) => {
    response.writeHead(302, {
      location: "https://vercel.com/sso-api?url=preview&nonce=redacted",
      "content-type": "text/html",
    });
    response.end("Vercel Authentication");
  }, async ({ baseUrl, requests }) => {
    const result = await runPowerShell({
      CYBER_SENTINELS_BASE_URL: baseUrl,
      CYBER_SENTINELS_TEST_EMAIL: controlledEmail,
      VERCEL_AUTOMATION_BYPASS_SECRET: bypass,
    }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Vercel Authentication\/SSO rejected/);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/login");
    assert.equal(requests[0].headers["x-vercel-protection-bypass"], bypass);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(bypass));
  });
});

test("executes request, privacy, malformed-input, and rate-limit proof without leaking values", { skip: !available }, async () => {
  const bypass = "vercel-automation-valid-proof-secret";
  await withServer(successfulResponder(), async ({ baseUrl, requests }) => {
    const result = await runPowerShell({
      CYBER_SENTINELS_BASE_URL: baseUrl,
      CYBER_SENTINELS_TEST_EMAIL: controlledEmail,
      VERCEL_AUTOMATION_BYPASS_SECRET: bypass,
    }, ["-AllowInsecureLocalhost"]);

    assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
    for (const marker of [
      "PREFLIGHT: PASS",
      "TURNSTILE_FAIL_CLOSED: PASS",
      "MALFORMED_EMAIL: PASS",
      "RESET_REQUEST_ACCEPTED: PASS",
      "ACCOUNT_ENUMERATION: PASS",
      "RATE_LIMIT: PASS (HTTP 429)",
      "OUTPUT_SAFETY: PASS",
    ]) assert.match(result.stdout, new RegExp(`^${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.match(result.stdout, /PASSWORD RESET REQUEST WORKING THROUGH CYBER SENTINELS PUBLIC HTTPS ENDPOINT/);
    assert.match(result.stdout, /Browser\/mailbox proof is still required/);
    assert.equal(result.stderr, "");
    assert.equal(requests.every((request) => request.headers.origin === baseUrl), true);
    assert.equal(requests.every((request) => request.headers["x-vercel-protection-bypass"] === bypass), true);
    assert.equal(requests.filter((request) => request.method === "POST").every(
      (request) => request.url === "/api/auth/password-reset/request",
    ), true);
    assert.equal(requests.every((request) => !request.url.includes("supabase")), true);
    assert.equal(requests.filter((request) => request.body).every((request) => {
      const body = JSON.parse(request.body);
      return body.password === undefined && body.newPassword === undefined && body.confirmPassword === undefined;
    }), true);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /@|XXXX\.DUMMY\.TOKEN\.XXXX/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, new RegExp(bypass));
  });
});

test("exits non-zero when known and unknown responses differ", { skip: !available }, async () => {
  await withServer(successfulResponder({ enumerates: true }), async ({ baseUrl }) => {
    const result = await runPowerShell({
      CYBER_SENTINELS_BASE_URL: baseUrl,
      CYBER_SENTINELS_TEST_EMAIL: controlledEmail,
    }, ["-AllowInsecureLocalhost"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Unknown-email reset request did not return the required generic accepted response/);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /No account exists|password-proof@/);
  });
});

test("exits non-zero when malformed input is accepted or 429 is not observed", { skip: !available }, async (t) => {
  await t.test("malformed input", async () => {
    await withServer(successfulResponder({ acceptMalformed: true }), async ({ baseUrl }) => {
      const result = await runPowerShell({
        CYBER_SENTINELS_BASE_URL: baseUrl,
        CYBER_SENTINELS_TEST_EMAIL: controlledEmail,
      }, ["-AllowInsecureLocalhost"]);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /Malformed email was not rejected safely/);
    });
  });
  await t.test("rate limiting", async () => {
    await withServer(successfulResponder({ neverRateLimit: true }), async ({ baseUrl }) => {
      const result = await runPowerShell({
        CYBER_SENTINELS_BASE_URL: baseUrl,
        CYBER_SENTINELS_TEST_EMAIL: controlledEmail,
      }, ["-AllowInsecureLocalhost"]);
      assert.equal(result.code, 1);
      assert.match(result.stderr, /Rate limiting did not produce HTTP 429/);
    });
  });
});
