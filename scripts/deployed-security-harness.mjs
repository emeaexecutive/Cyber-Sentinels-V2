import { createHash, createHmac } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

if (process.env.RUN_DEPLOYED_SECURITY_TESTS !== "true") {
  process.stderr.write("Blocked: set RUN_DEPLOYED_SECURITY_TESTS=true and STAGING_BASE_URL explicitly.\n");
  process.exit(2);
}
const baseUrl = process.env.STAGING_BASE_URL?.replace(/\/$/, "");
if (!baseUrl || !/^https:\/\//.test(baseUrl)) throw new Error("STAGING_BASE_URL must be an explicit HTTPS staging URL.");
const buildVersion = process.env.DEPLOYED_BUILD_VERSION || "not_supplied";
const operator = process.env.SECURITY_TEST_OPERATOR || "not_supplied";
const results = [];

async function record(name, run, limitation = "") {
  const started = new Date().toISOString();
  try {
    const evidence = await run();
    results.push({ name, result: "passed", timestamp: started, evidenceReference: evidence, limitation, operator });
  } catch (error) {
    results.push({ name, result: "failed", timestamp: started, evidenceReference: null, limitation: `${limitation} ${error instanceof Error ? error.message : "Unknown failure"}`.trim(), operator });
  }
}

await record("public_page_availability", async () => {
  const response = await fetch(`${baseUrl}/`, { redirect: "manual" });
  if (response.status !== 200) throw new Error(`Expected 200, received ${response.status}.`);
  return `http:${response.status}:sha256:${createHash("sha256").update(baseUrl).digest("hex").slice(0, 12)}`;
});
await record("protected_route_denial", async () => {
  const response = await fetch(`${baseUrl}/admin/deployment-readiness`, { redirect: "manual" });
  if (![302, 303, 307, 308].includes(response.status)) throw new Error(`Expected redirect denial, received ${response.status}.`);
  return `http:${response.status}:location:${new URL(response.headers.get("location") || "/", baseUrl).pathname}`;
});
await record("anonymous_api_denial", async () => {
  const response = await fetch(`${baseUrl}/api/providers`, { redirect: "manual" });
  if (response.status !== 401) throw new Error(`Expected 401, received ${response.status}.`);
  return "http:401";
});
await record("forged_webhook_rejection", async () => {
  const response = await fetch(`${baseUrl}/api/providers`, { method: "POST", headers: { "content-type": "application/json", "x-hopae-signature": "t=1,v1=forged" }, body: JSON.stringify({ event_id: "rc6-forged", verification_id: "unknown" }) });
  if (response.status !== 401) throw new Error(`Expected 401, received ${response.status}.`);
  return "http:401";
});
await record("stale_webhook_rejection", async () => {
  const secret = process.env.HOPAE_TEST_SIGNING_SECRET;
  if (!secret) throw new Error("HOPAE_TEST_SIGNING_SECRET name is required for this staging-only check.");
  const body = JSON.stringify({ event_id: "rc6-stale", verification_id: "unknown" });
  const timestamp = Math.floor(Date.now() / 1000) - 900;
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  const response = await fetch(`${baseUrl}/api/providers`, { method: "POST", headers: { "content-type": "application/json", "x-hopae-signature": `t=${timestamp},v1=${signature}` }, body });
  if (response.status !== 401) throw new Error(`Expected 401, received ${response.status}.`);
  return "http:401";
}, "Secret value is used in memory and never written to the report.");
await record("oversized_payload_rejection", async () => {
  const response = await fetch(`${baseUrl}/api/providers`, { method: "POST", headers: { "content-type": "application/json", "content-length": "300000" }, body: "{}" });
  if (response.status !== 413) throw new Error(`Expected 413, received ${response.status}.`);
  return "http:413";
});

for (const [name, envName] of [
  ["invalid_session_denial", "SECURITY_TEST_INVALID_SESSION_URL"], ["expired_session_behavior", "SECURITY_TEST_EXPIRED_SESSION_URL"],
  ["logout", "SECURITY_TEST_LOGOUT_URL"], ["password_reset_boundary", "SECURITY_TEST_PASSWORD_RESET_URL"],
  ["admin_allowlist", "SECURITY_TEST_ADMIN_ALLOWLIST_URL"], ["admin_verification", "SECURITY_TEST_ADMIN_VERIFICATION_URL"],
  ["duplicate_webhook_rejection", "SECURITY_TEST_DUPLICATE_WEBHOOK_URL"],
  ["revoked_authority", "SECURITY_TEST_REVOKED_AUTHORITY_URL"], ["expired_authority", "SECURITY_TEST_EXPIRED_AUTHORITY_URL"],
  ["kill_switch_enforcement", "SECURITY_TEST_KILL_SWITCH_URL"],
]) {
  await record(name, async () => {
    const url = process.env[envName];
    if (!url) throw new Error(`${envName} name is required for this deployment-specific check.`);
    const response = await fetch(new URL(url, baseUrl), { redirect: "manual", headers: process.env.SECURITY_TEST_BEARER_TOKEN ? { authorization: `Bearer ${process.env.SECURITY_TEST_BEARER_TOKEN}` } : {} });
    if (![401, 403, 409, 423, 429].includes(response.status)) throw new Error(`Expected a safe denial status, received ${response.status}.`);
    return `http:${response.status}`;
  });
}
await record("rate_limit_response", async () => {
  const path = process.env.SECURITY_TEST_RATE_LIMIT_URL;
  if (!path) throw new Error("SECURITY_TEST_RATE_LIMIT_URL name is required for this explicit probe.");
  const attempts = Math.max(2, Math.min(200, Number(process.env.SECURITY_TEST_RATE_LIMIT_ATTEMPTS || 130)));
  for (let index = 0; index < attempts; index += 1) {
    const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
    if (response.status === 429) return `http:429:attempt:${index + 1}`;
  }
  throw new Error(`No 429 response within ${attempts} explicit attempts.`);
}, "Run only against an approved staging rate-limit target.");

const report = { schemaVersion: 1, environment: baseUrl, buildVersion, generatedAt: new Date().toISOString(), operator, results, summary: { passed: results.filter((item) => item.result === "passed").length, failed: results.filter((item) => item.result === "failed").length } };
await mkdir("test-results", { recursive: true });
await writeFile("test-results/rc6-deployed-security.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.summary.failed) process.exitCode = 1;
