import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const origin = "https://www.cybersentinels.com";
const directory = join(tmpdir(), "cyber-v2-production-qualification");
const metadata = JSON.parse(await readFile(join(directory, "key-metadata.json"), "utf8"));
const context = await chromium.launchPersistentContext(join(tmpdir(), "cs-production-proof-playwright"), {
  headless: true,
  executablePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
});
try {
  const response = await context.request.patch(`${origin}/api/developer/api-keys`, {
    headers: { "x-enterprise-id": metadata.tenant },
    data: { key_id: metadata.keyId, action: "revoke" },
  });
  const body = await response.json();
  if (response.status() !== 200 || body.key?.status !== "revoked") throw new Error(`Key cleanup failed: ${response.status()} ${body.error ?? ""}`);
  await writeFile(join(directory, "key-cleanup.json"), JSON.stringify({ checkedAt: new Date().toISOString(), keyId: metadata.keyId, status: body.key.status, revokedAt: body.key.revoked_at }, null, 2));
  console.log(JSON.stringify({ status: "REVOKED", keyId: metadata.keyId, revokedAt: body.key.revoked_at }));
} finally {
  await context.close();
}
