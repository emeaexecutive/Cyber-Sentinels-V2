import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const origin = "https://www.cybersentinels.com";
const directory = join(tmpdir(), "cyber-v2-production-qualification");
const scopes = ["trust:read", "incidents:read", "incidents:write", "evidence:write", "evidence:export", "outcomes:write"];
const context = await chromium.launchPersistentContext(join(tmpdir(), "cs-production-proof-playwright"), {
  headless: true,
  executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
});
try {
  let tenant;
  context.on("request", (request) => {
    if (request.url() === `${origin}/api/developer/api-keys`) tenant = request.headers()["x-enterprise-id"];
  });
  const page = await context.newPage();
  await page.goto(`${origin}/developers/api-keys`, { waitUntil: "networkidle" });
  if (!tenant) throw new Error("Authenticated tenant was not established");
  const response = await context.request.post(`${origin}/api/developer/api-keys`, {
    headers: { "x-enterprise-id": tenant },
    data: {
      label: "V2_PRODUCTION_EPIC1_QUALIFICATION_20260911",
      environment: "live",
      expires_at: new Date(Date.now() + 2 * 3600000).toISOString(),
      scopes,
    },
  });
  const body = await response.json();
  if (response.status() !== 201 || !/^cs_live_/.test(body.api_key ?? "")) {
    throw new Error(`Key issuance failed: ${response.status()} ${body.error ?? ""}`);
  }
  await mkdir(directory, { recursive: true });
  const encryptedPath = join(directory, "qualification-key.dpapi");
  const protection = spawnSync("powershell.exe", ["-NoProfile", "-Command", "Add-Type -AssemblyName System.Security; $raw=[Console]::In.ReadToEnd(); $bytes=[Text.Encoding]::UTF8.GetBytes($raw); $protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [IO.File]::WriteAllBytes($env:V2_KEY_PATH,$protected);"], {
    input: body.api_key,
    encoding: "utf8",
    env: { ...process.env, V2_KEY_PATH: encryptedPath },
  });
  if (protection.status !== 0) throw new Error("Could not protect the issued key");
  await writeFile(join(directory, "key-metadata.json"), JSON.stringify({ tenant, keyId: body.key.id, scopes, expiresAt: body.key.expires_at }, null, 2));
  console.log(JSON.stringify({ status: "ISSUED", tenant, keyId: body.key.id, scopes, expiresAt: body.key.expires_at }));
} finally {
  await context.close();
}
