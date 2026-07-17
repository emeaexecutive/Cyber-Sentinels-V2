import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HopaeClient } from "../lib/providers/adapters/hopae/hopae-client.ts";
import { inspectHopaeProviderConfig } from "../lib/providers/adapters/hopae/hopae-config.ts";

if (process.env.RUN_HOPAE_LIVE_TESTS !== "true") {
  throw new Error("Blocked: RUN_HOPAE_LIVE_TESTS=true is required for the opt-in Hopae sandbox check.");
}
const inspected = inspectHopaeProviderConfig();
if (!inspected.configured) throw new Error(`Blocked: Hopae sandbox configuration is incomplete (${[...inspected.missing, ...inspected.invalid].join(", ")}).`);
if (inspected.config.environment !== "sandbox") throw new Error("Blocked: test:hopae-live is sandbox-only; production execution requires separate approval.");

const startedAt = new Date().toISOString();
const correlationId = crypto.randomUUID();
const client = new HopaeClient(inspected.config);
const result = await client.createVerification({
  context: { tenantId: "sandbox-live-harness", actorId: "sandbox-harness", trustSessionId: "sandbox-harness", correlationId },
  purpose: "approved_hopae_sandbox_connectivity",
  redirectUri: process.env.HOPAE_LIVE_REDIRECT_URI?.trim() || "https://www.cybersentinels.com/demo/trust-execution-flow",
  idempotencyKey: correlationId,
});
const report = {
  evidenceMode: "provider_sandbox",
  productionEvidence: false,
  provider: "Hopae Connect",
  environment: inspected.config.environment,
  providerId: inspected.config.providerId,
  correlationId,
  providerSessionId: result.verification.verificationId,
  providerRequestId: result.requestId,
  status: result.verification.status,
  startedAt,
  completedAt: new Date().toISOString(),
  limitation: "This creates a sandbox verification session only. It does not use a customer identity, complete an eID flow, prove callback delivery, or establish production readiness.",
};
const scriptDir = dirname(fileURLToPath(import.meta.url));
const output = resolve(scriptDir, "../docs/epic-16/evidence/HOPAE_LIVE_SANDBOX_EVIDENCE.json");
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
