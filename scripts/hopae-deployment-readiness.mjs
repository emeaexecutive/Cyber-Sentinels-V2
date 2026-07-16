import { inspectHopaeDeploymentReadiness } from "../lib/providers/deployment-readiness.ts";

const result = await inspectHopaeDeploymentReadiness();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.configured || !result.migrationApplied || result.currentMaturityState !== "Live") process.exitCode = 2;
