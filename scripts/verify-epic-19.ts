import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type Finding = { severity: "critical" | "remediation"; check: string; detail: string };
const root = process.cwd();
const findings: Finding[] = [];
const required = [
  "docs/reviews/EPIC-19-REPOSITORY-TRUTH-AUDIT.md", "docs/architecture/CONTINUOUS-TRUST-RUNTIME.md", "docs/reviews/EPIC-19-DEPLOYMENT-READINESS.md",
  "src/lib/continuous-trust/types.ts", "src/lib/continuous-trust/engine.ts", "src/lib/continuous-trust/repository.ts", "src/lib/continuous-trust/service.ts",
  "supabase/migrations/202607210002_continuous_trust_runtime.sql", "app/api/trust/runtime/route.ts", "app/api/trust/runtime/[subjectId]/route.ts",
  "app/api/trust/timeline/route.ts", "app/api/trust/events/route.ts", "app/api/trust/evidence/route.ts", "app/api/trust/alerts/route.ts",
  "app/api/trust/replay/[decisionId]/route.ts", "app/api/trust/providers/health/route.ts", "app/api/trust/recalculate/route.ts", "app/api/trust/refresh/route.ts",
  "app/api/trust/alerts/[id]/acknowledge/route.ts", "app/api/trust/alerts/[id]/resolve/route.ts", "app/dashboard/trust-runtime/page.tsx",
  "tests/continuous-trust-runtime.test.mjs", "tests/rls/continuous-trust-runtime.test.mjs",
];
const add = (severity: Finding["severity"], check: string, detail: string) => findings.push({ severity, check, detail });
const text = (path: string) => readFileSync(join(root, path), "utf8");
const output = (result: ReturnType<typeof spawnSync>) => `${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`.slice(-2500);
for (const path of required) if (!existsSync(join(root, path))) add("critical", "required-file", path);
const major = Number(process.versions.node.split(".")[0]); if (major !== 22) add("critical", "node-version", `Expected Node 22.x, received ${process.versions.node}.`);
const packageJson = JSON.parse(text("package.json")) as { engines?: { node?: string }; scripts?: Record<string, string> }; if (packageJson.engines?.node !== "22.x") add("critical", "node-enforcement", String(packageJson.engines?.node)); if (!packageJson.scripts?.["test:continuous-trust"] || !packageJson.scripts?.["verify:19"]) add("critical", "package-scripts", "EPIC 19 scripts missing.");
if (existsSync(join(root, "supabase/migrations/202607210002_continuous_trust_runtime.sql"))) { const sql = text("supabase/migrations/202607210002_continuous_trust_runtime.sql"); for (const token of ["apply_trust_state_decision_v1", "continuous_trust_assessments", "trust_drift_findings", "tenant reads continuous trust alerts", "user_can_access_trust_workspace(enterprise_id)", "revoke insert,update,delete on public.trust_alerts from authenticated", "apply_continuous_trust_assessment_v1"]) if (!sql.includes(token)) add("critical", "migration-contract", token); if (/create table public\.(trust_alerts|subject_trust_state|trust_events|evidence_objects)/.test(sql)) add("critical", "duplicate-authority", "EPIC 19 creates a duplicate authoritative table."); }
const allMigrations = readdirSync(join(root, "supabase/migrations")).filter((name) => name.endsWith(".sql")).map((name) => text(`supabase/migrations/${name}`)).join("\n"); for (const table of ["trust_alerts", "subject_trust_state"]) { const count = [...allMigrations.matchAll(new RegExp(`create table(?: if not exists)? public\\.${table}\\b`, "gi"))].length; if (count !== 1) add("critical", "duplicate-table-count", `${table}: ${count}`); }
const dashboard = existsSync(join(root, "src/components/continuous-trust/ContinuousTrustDashboard.tsx")) ? text("src/components/continuous-trust/ContinuousTrustDashboard.tsx") : ""; if (/mock|demoEvidence|fabricated/i.test(dashboard)) add("critical", "production-truth", "Runtime dashboard contains mock/demo evidence."); if (!/pollIntervalMs = 30_000/.test(dashboard)) add("critical", "polling-fallback", "Bounded polling fallback missing.");
const sourceRoots = ["app", "src", "scripts"]; const secretPattern = /(SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|OPENAI_API_KEY)\s*[:=]\s*["'][^"']{12,}["']/; for (const folder of sourceRoots) { const stack = [join(root, folder)]; while (stack.length) { const current = stack.pop()!; for (const entry of readdirSync(current, { withFileTypes: true })) { const path = join(current, entry.name); if (entry.isDirectory()) stack.push(path); else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && secretPattern.test(readFileSync(path, "utf8"))) add("critical", "secret-leak", path.slice(root.length + 1)); } } }
const diff = spawnSync("git", ["diff", "--check"], { cwd: root, encoding: "utf8" }); if (diff.status !== 0) add("critical", "diff-check", output(diff));
const typecheck = spawnSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--noEmit"], { cwd: root, encoding: "utf8", timeout: 120_000 }); if (typecheck.status !== 0) add("critical", "typecheck", output(typecheck));
const tests = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "tests/continuous-trust-runtime.test.mjs", "tests/rls/continuous-trust-runtime.test.mjs"], { cwd: root, encoding: "utf8", timeout: 120_000 }); if (tests.status !== 0) add("critical", "tests", output(tests));
if (!existsSync(join(root, ".next/BUILD_ID"))) add("remediation", "production-build", "Run the Node 22 production build before release.");
const critical = findings.filter((finding) => finding.severity === "critical");
console.log("EPIC 19 VERIFIER");
console.log(JSON.stringify({ status: critical.length ? "CRITICAL_BLOCKER" : findings.length ? "REMEDIATION_REQUIRED" : "PASSED", node: process.versions.node, checks: { requiredFiles: required.length, typecheck: typecheck.status === 0, tests: tests.status === 0, buildArtifact: existsSync(join(root, ".next/BUILD_ID")) }, findings }, null, 2));
process.exit(critical.length ? 2 : findings.length ? 1 : 0);
