import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Check = { name: string; status: "PASS" | "FAIL" | "BLOCKED"; critical: boolean; detail: string; durationMs?: number };
const root = resolve(import.meta.dirname, "..");
const checks: Check[] = [];
const required = [
  "src/lib/trust-events/types.ts", "src/lib/trust-events/canonicalize.ts", "src/lib/trust-events/hash.ts", "src/lib/trust-events/gateway.ts", "src/lib/trust-events/provider-registry.ts", "src/lib/trust-events/normalize.ts", "src/lib/trust-events/redaction.ts",
  "supabase/migrations/202607200001_canonical_trust_event_foundation.sql", "app/api/trust-events/ingest/[provider]/route.ts", "app/api/trust-events/route.ts", "app/api/trust-events/[id]/route.ts", "app/api/trust-events/[id]/integrity/route.ts", "app/api/trust-events/subjects/[subjectId]/route.ts", "app/api/trust-events/workflows/[workflowId]/route.ts", "app/api/trust-events/sessions/[sessionId]/route.ts", "app/api/trust-events/providers/health/route.ts",
  "docs/implementation/EPIC-17.1D-IMPLEMENTATION-REPORT.md", "docs/architecture/TRUST-EVENT-V1.md", "docs/architecture/PROVIDER-ENVELOPE-CONTRACT.md", "docs/security/TRUST-EVENT-INTEGRITY.md", "docs/security/EVIDENCE-MINIMISATION.md", "docs/operations/EPIC-17.1D-RUNBOOK.md", "docs/implementation/EPIC-17.1D-TEST-REPORT.md",
];

for (const path of required) checks.push({ name: `Required artifact: ${path}`, status: existsSync(join(root, path)) ? "PASS" : "FAIL", critical: true, detail: existsSync(join(root, path)) ? "Present" : "Missing" });

function sourceCheck(name: string, path: string, patterns: RegExp[], critical = false) {
  try { const source = readFileSync(join(root, path), "utf8"); const missing = patterns.filter((pattern) => !pattern.test(source)); checks.push({ name, status: missing.length ? "FAIL" : "PASS", critical, detail: missing.length ? `${missing.length} required invariant(s) absent` : "Required invariants present" }); }
  catch { checks.push({ name, status: "FAIL", critical, detail: "Artifact could not be read" }); }
}

sourceCheck("World ID safety invariant", "src/lib/trust-events/provider-registry.ts", [/WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED/, /serverVerified: false/, /confidence: 0/], true);
sourceCheck("Placeholder zero-contribution invariant", "src/lib/trust-events/provider-registry.ts", [/protocol: "UNSUPPORTED"/, /positiveEvidence: false/, /normalize\(\)[\s\S]*?\{ return \[\]; \}/], true);
sourceCheck("Per-enterprise locking", "supabase/migrations/202607200001_canonical_trust_event_foundation.sql", [/pg_advisory_xact_lock/, /enterprise::text \|\| ':default'/, /for update/i], true);
sourceCheck("Evidence minimisation", "supabase/migrations/202607200001_canonical_trust_event_foundation.sql", [/EVIDENCE_VAULT/, /object_encrypted/, /Raw payload retention is prohibited/], true);
sourceCheck("Strict persisted Trust Event model", "supabase/migrations/202607200001_canonical_trust_event_foundation.sql", [/trust_events_v1_subject_type_check/, /trust_events_v1_actor_type_check/, /trust_events_v1_protocol_check/, /trust_events_v1_integrity_check/], true);
sourceCheck("Finalized envelope immutability", "supabase/migrations/202607200001_canonical_trust_event_foundation.sql", [/prevent_finalized_trust_event_envelope_mutation/, /old\.processed_at is not null/, /Finalized Trust Event envelopes are immutable/], true);
sourceCheck("Rejected envelope audit fidelity", "src/lib/trust-events/repository.ts", [/protocol: input\.protocol/, /action: "ENVELOPE_REJECTED"/, /reasonCodes: input\.reasonCodes/], true);
sourceCheck("Complete runtime event validation", "src/lib/trust-events/canonicalize.ts", [/provider\.serverVerified/, /ordering metadata/, /supersedesEventId/, /providerSequence/], true);
sourceCheck("Stable compound pagination", "src/lib/trust-events/http.ts", [/encodeTrustEventCursor/, /receivedAt/, /eventId/, /base64url/], true);
sourceCheck("Established Hopae callback bridge", "app/api/providers/route.ts", [/request\.arrayBuffer\(\)/, /ingestTrustEventRequest/, /canonical_trust_event_persistence_failed/], true);

for (const [name, command] of [["Lint", "lint"], ["TypeScript", "typecheck"], ["Trust Event tests", "test:trust-events"], ["Production build", "build"]] as const) {
  const started = Date.now();
  const executable = process.platform === "win32" ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe") : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", `npm.cmd run ${command}`] : ["run", command];
  const result = spawnSync(executable, args, { cwd: root, encoding: "utf8", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, windowsHide: true, timeout: 600_000 });
  checks.push({ name, status: result.status === 0 ? "PASS" : "FAIL", critical: false, durationMs: Date.now() - started, detail: result.status === 0 ? "Command passed" : `Command exited ${result.status ?? "without a code"}` });
}

checks.push({ name: "Vercel control proof", status: "BLOCKED", critical: false, detail: "BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code" });
checks.push({ name: "Cloudflare control proof", status: "BLOCKED", critical: false, detail: "BLOCKED_BY_EXTERNAL_CONFIGURATION — not inferred from source code" });
checks.push({ name: "Supabase migration deployment proof", status: "BLOCKED", critical: false, detail: "BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not alter infrastructure" });

const criticalFailures = checks.filter((check) => check.status === "FAIL" && check.critical);
const failures = checks.filter((check) => check.status === "FAIL");
const exitCode = criticalFailures.length ? 2 : failures.length ? 1 : 0;
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reports = join(root, "reports"); mkdirSync(reports, { recursive: true });
const reportPath = join(reports, `epic-17.1d-verification-${timestamp}.md`);
const lines = ["# EPIC 17.1D Verification Report", "", `Generated: ${new Date().toISOString()}`, `Aggregate exit code: ${exitCode}`, "", "| Check | Status | Critical | Detail |", "|---|---|---:|---|", ...checks.map((check) => `| ${check.name.replaceAll("|", "\\|")} | ${check.status} | ${check.critical ? "yes" : "no"} | ${check.detail.replaceAll("|", "\\|")}${check.durationMs === undefined ? "" : ` (${check.durationMs} ms)`} |`), "", "External controls remain blocked until directly proven. No deployment, infrastructure mutation, Production data access, or secret output was performed.", ""];
writeFileSync(reportPath, lines.join("\n"), "utf8");
console.log(`EPIC 17.1D verifier: ${exitCode === 0 ? "PASSED" : exitCode === 1 ? "REMEDIATION REQUIRED" : "CRITICAL BLOCKER"}`);
console.log(`Report: ${reportPath}`);
process.exitCode = exitCode;
