import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import process from "node:process";
import os from "node:os";
import { auditMigrations, type MigrationAudit } from "./audit-migrations.ts";
import { requireNode22 } from "./node-version.ts";
import { runSecurityChecks, type SecurityAudit } from "./security-checks.ts";
import { checkTrustInfrastructure, type TrustInfrastructureAudit } from "./trust-infrastructure-checks.ts";
import { runBoundedCommand } from "./bounded-subprocess.ts";

type Options = { full: boolean; migrate: boolean; skipInstall: boolean; skipBuild: boolean; dryRun: boolean; help: boolean };
type StageStatus = "PASS" | "PASS WITH WARNINGS" | "FAIL" | "SKIPPED";
type StageResult = { name: string; status: StageStatus; command: string; detail: string };

const repoRoot = resolve(process.cwd());
const reportsRoot = resolve(process.env.CYBER_SENTINELS_REPORTS_ROOT ?? join(repoRoot, "reports"));
const npmCli = process.env.CYBER_SENTINELS_NPM_CLI ?? process.env.npm_execpath;
const npmExecutable = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmPrefix = npmCli ? [npmCli] : [];
const npxCli = npmCli ? join(dirname(npmCli), "npx-cli.js") : null;
const npxExecutable = npxCli ? process.execPath : process.platform === "win32" ? "npx.cmd" : "npx";
const npxPrefix = npxCli ? [npxCli] : [];
const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
const childEnvironment = { ...process.env, [pathKey]: `${dirname(process.execPath)}${delimiter}${process.env[pathKey] ?? ""}` };
const stages: StageResult[] = [];
const warnings: string[] = [];
const captureTimeoutMs = 30_000;
const configuredStageTimeout = Number(process.env.CYBER_SENTINELS_STAGE_TIMEOUT_MS ?? 1_200_000);
const stageTimeoutMs = Number.isFinite(configuredStageTimeout) && configuredStageTimeout >= 1_000 ? configuredStageTimeout : 1_200_000;
let currentStage = "Argument validation";
let failure: Error | null = null;
let migrationAudit: MigrationAudit | null = null;
let securityAudit: SecurityAudit | null = null;
let trustAudit: TrustInfrastructureAudit | null = null;
let dependencyAuditSummary = "Not run.";

function parseOptions(argumentsToParse: string[]): Options {
  const supported = new Set(["--full", "--migrate", "--skip-install", "--skip-build", "--dry-run", "--help"]);
  const unknown = argumentsToParse.filter((flag) => !supported.has(flag));
  if (unknown.length) throw new Error(`Unknown release flag(s): ${unknown.join(", ")}`);
  return {
    full: argumentsToParse.includes("--full"),
    migrate: argumentsToParse.includes("--migrate"),
    skipInstall: argumentsToParse.includes("--skip-install"),
    skipBuild: argumentsToParse.includes("--skip-build"),
    dryRun: argumentsToParse.includes("--dry-run"),
    help: argumentsToParse.includes("--help"),
  };
}

function printHelp() {
  console.log("Cyber Sentinels Node 22 release manager");
  console.log("Usage: npm run release -- [--full] [--migrate] [--skip-install] [--skip-build] [--dry-run] [--help]");
}

function commandLabel(executable: string, args: string[]) {
  return [executable, ...args].join(" ");
}

function capture(executable: string, args: string[]) {
  const result = spawnSync(executable, args, { cwd: repoRoot, encoding: "utf8", env: childEnvironment, shell: false, windowsHide: true, timeout: captureTimeoutMs, maxBuffer: 1024 * 1024 });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") throw new Error(`${commandLabel(executable, args)} timed out after ${captureTimeoutMs}ms.`);
  if (result.error || result.status !== 0) throw new Error(`${commandLabel(executable, args)} failed.`);
  return result.stdout.trim();
}

function safeCapture(executable: string, args: string[]) {
  try { return capture(executable, args); } catch { return "unavailable"; }
}

async function run(executable: string, args: string[], name: string) {
  currentStage = name;
  console.log(`\n==> ${name}`);
  console.log(commandLabel(executable, args));
  const result = await runBoundedCommand(executable, args, { cwd: repoRoot, env: childEnvironment, timeoutMs: stageTimeoutMs });
  const outputSummary = `Captured ${result.stdoutBytes} stdout bytes and ${result.stderrBytes} stderr bytes; content omitted to avoid secret disclosure.`;
  if (result.timedOut) {
    stages.push({ name, status: "FAIL", command: commandLabel(executable, args), detail: `Timed out after ${stageTimeoutMs}ms; process tree terminated. ${outputSummary}` });
    throw new Error(`${name} timed out after ${stageTimeoutMs}ms; process tree terminated.`);
  }
  if (result.error || result.status !== 0) {
    const exitCode = result.status ?? 1;
    stages.push({ name, status: "FAIL", command: commandLabel(executable, args), detail: `Exited with code ${exitCode}. ${outputSummary}` });
    throw new Error(`${name} failed with exit code ${exitCode}.`);
  }
  stages.push({ name, status: "PASS", command: commandLabel(executable, args), detail: `Completed successfully. ${outputSummary}` });
}

function skip(name: string, command: string, detail: string) {
  stages.push({ name, status: "SKIPPED", command, detail });
}

async function runDependencyAudit() {
  const name = "Dependency security audit";
  currentStage = name;
  const args = [...npmPrefix, "audit", "--omit=dev", "--json"];
  const result = spawnSync(npmExecutable, args, { cwd: repoRoot, encoding: "utf8", env: childEnvironment, shell: false, windowsHide: true, timeout: stageTimeoutMs, maxBuffer: 16 * 1024 * 1024 });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") {
    stages.push({ name, status: "FAIL", command: commandLabel(npmExecutable, args), detail: `Timed out after ${stageTimeoutMs}ms.` });
    throw new Error(`Dependency security audit timed out after ${stageTimeoutMs}ms.`);
  }
  let counts = { low: 0, moderate: 0, high: 0, critical: 0 };
  try {
    const parsed = JSON.parse(result.stdout || "{}") as { metadata?: { vulnerabilities?: Partial<typeof counts> } };
    counts = { ...counts, ...parsed.metadata?.vulnerabilities };
  } catch {
    warnings.push("npm audit output could not be parsed; review npm audit manually.");
    stages.push({ name, status: "PASS WITH WARNINGS", command: commandLabel(npmExecutable, args), detail: "Audit output was not parseable." });
    dependencyAuditSummary = "WARNING: npm audit output could not be parsed.";
    return;
  }
  dependencyAuditSummary = `Production dependency advisories: ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low.`;
  if (counts.critical > 0) {
    stages.push({ name, status: "FAIL", command: commandLabel(npmExecutable, args), detail: dependencyAuditSummary });
    throw new Error("Critical production dependency advisories detected; release is blocked.");
  }
  const status: StageStatus = counts.high || counts.moderate || counts.low ? "PASS WITH WARNINGS" : "PASS";
  stages.push({ name, status, command: commandLabel(npmExecutable, args), detail: dependencyAuditSummary });
  if (status === "PASS WITH WARNINGS") warnings.push(dependencyAuditSummary);
}

function writeReport(name: string, title: string, status: string, checks: string[], remediation: string) {
  mkdirSync(reportsRoot, { recursive: true });
  const lines = [
    `# ${title}`,
    "",
    `- Timestamp: ${new Date().toISOString()}`,
    `- Status: ${status}`,
    `- Checks or commands: ${checks.length ? checks.join("; ") : "None completed"}`,
    `- Exact failure stage: ${failure ? currentStage : "None"}`,
    `- Actionable remediation: ${remediation}`,
    "- Secret handling: No secret values are included.",
    "",
  ];
  writeFileSync(join(reportsRoot, name), lines.join("\n"), "utf8");
}

function environmentReport(options: Options) {
  const statusText = safeCapture("git", ["status", "--porcelain", "--untracked-files=all"]);
  const dirtyCount = statusText === "unavailable" || !statusText ? 0 : statusText.split(/\r?\n/).filter(Boolean).length;
  if (dirtyCount) warnings.push(`Working tree is dirty (${dirtyCount} entries).`);
  const lines = [
    "# Environment report",
    "",
    `- Timestamp: ${new Date().toISOString()}`,
    `- Status: ${failure && currentStage === "Node 22 guard" ? "FAIL" : "PASS WITH WARNINGS"}`,
    `- OS: ${os.platform()} ${os.release()}`,
    `- Architecture: ${os.arch()}`,
    `- Branch: ${safeCapture("git", ["branch", "--show-current"])}`,
    `- Commit: ${safeCapture("git", ["rev-parse", "HEAD"])}`,
    `- Working tree: ${dirtyCount ? `dirty (${dirtyCount} entries)` : "clean"}`,
    `- Repository: ${repoRoot}`,
    `- Node: ${process.versions.node}`,
    `- npm: ${safeCapture(npmExecutable, [...npmPrefix, "--version"])}`,
    `- Git: ${safeCapture("git", ["--version"])}`,
    `- Supabase CLI: ${options.migrate ? safeCapture(npxExecutable, [...npxPrefix, "supabase", "--version"]) : "not requested"}`,
    "- Checks or commands: repository metadata and explicit tool version commands",
    `- Exact failure stage: ${failure ? currentStage : "None"}`,
    `- Actionable remediation: ${failure && currentStage === "Node 22 guard" ? "Activate Node.js 22 using .nvmrc or .node-version, then rerun." : "Review dirty-worktree warnings before approving a release."}`,
    "- Secret handling: No environment values are read or printed.",
    "",
  ];
  writeFileSync(join(reportsRoot, "EnvironmentReport.md"), lines.join("\n"), "utf8");
}

function finalReports(options: Options) {
  mkdirSync(reportsRoot, { recursive: true });
  environmentReport(options);
  if (!migrationAudit) writeReport("MigrationReport.md", "Migration report", options.migrate ? "FAIL" : "SKIPPED", ["Migration audit not completed"], "Run under Node 22; review the static audit before using --migrate.");
  if (!securityAudit) writeReport("SecurityReport.md", "Security report", "FAIL", ["Security checks not completed"], "Run the release manager under Node 22 and resolve the first mandatory failure.");
  else {
    const securityPath = join(reportsRoot, "SecurityReport.md");
    const securityText = readFileSync(securityPath, "utf8");
    writeFileSync(securityPath, `${securityText.trimEnd()}\n\n## Production dependency audit\n\n- ${dependencyAuditSummary}\n- Critical advisories block release; lower severities remain explicit warnings requiring review.\n`, "utf8");
  }
  if (!trustAudit) writeReport("TrustInfrastructureReport.md", "Trust infrastructure report", "NOT RUN", ["Trust checks not completed"], "Run the release manager under Node 22; do not create placeholder modules to satisfy this report.");

  const consentStages = stages.filter((stage) => /consent/i.test(stage.name));
  const consentStatus = consentStages.some((stage) => stage.status === "FAIL") ? "FAIL" : consentStages.length && consentStages.every((stage) => stage.status === "PASS") ? "PASS" : "NOT RUN";
  writeReport("ConsentReport.md", "Consent report", consentStatus, consentStages.map((stage) => `${stage.command}: ${stage.status}`), consentStatus === "PASS" ? "None." : "Resolve the recorded failure and rerun targeted consent tests under Node 22.");

  const buildStages = stages.filter((stage) => ["Lint", "TypeScript", "Full tests", "Build"].includes(stage.name));
  const buildStatus = buildStages.some((stage) => stage.status === "FAIL") ? "FAIL" : buildStages.some((stage) => stage.name === "Build" && stage.status === "PASS") ? "PASS" : "NOT RUN";
  writeReport("BuildReport.md", "Build report", buildStatus, buildStages.map((stage) => `${stage.command}: ${stage.status}`), buildStatus === "PASS" ? "None." : "Run all mandatory lint, typecheck, and build stages under Node 22.");

  const mandatoryFailure = Boolean(failure) || securityAudit?.status === "FAIL";
  const mandatorySkipped = options.dryRun || options.skipBuild || !stages.some((stage) => stage.name === "Build" && stage.status === "PASS");
  const ready = !mandatoryFailure && !mandatorySkipped;
  const checks = stages.map((stage) => `${stage.name} [${stage.status}] ${stage.command}`);
  writeReport("DeploymentReport.md", "Deployment report", ready ? "READY" : "NOT READY", checks, ready ? "No mandatory remediation. Review reports and approve deployment separately." : failure?.message ?? "Complete skipped mandatory validation under Node 22.");

  const issues = [
    ...warnings,
    ...(options.dryRun ? ["Dry-run mode skipped mutating and validation commands; it cannot produce READY."] : []),
    ...(options.skipBuild ? ["Build was explicitly skipped; deployment readiness cannot be asserted."] : []),
    ...(!options.full ? ["The full test suite was not requested."] : []),
    ...(!options.migrate ? ["Supabase migration push and linked-database verification were not requested."] : []),
    ...(failure ? [`Mandatory failure at ${currentStage}: ${failure.message}`] : []),
  ];
  writeReport("KnownIssues.md", "Known issues", issues.length ? "OPEN ITEMS" : "NONE", issues, issues.length ? "Address or explicitly accept each item before release approval." : "None.");

  return ready;
}

function terminalSummary(ready: boolean, options: Options) {
  const statusOf = (name: string) => stages.find((stage) => stage.name === name)?.status ?? "SKIPPED";
  console.log("\n==================================================");
  console.log("CYBER SENTINELS — NODE 22 RELEASE REPORT");
  console.log("==================================================\n");
  console.log(`Environment ........ ${failure && currentStage === "Node 22 guard" ? "FAIL" : "PASS"}`);
  console.log(`Dependencies ....... ${statusOf("Dependencies")}`);
  console.log(`Consent ............ ${stages.some((stage) => /consent/i.test(stage.name) && stage.status === "FAIL") ? "FAIL" : statusOf("Consent tests")}`);
  console.log(`Migrations ......... ${options.migrate ? (migrationAudit?.status ?? "FAIL") : "SKIPPED"}`);
  const dependencySecurity = stages.find((stage) => stage.name === "Dependency security audit")?.status;
  const securityStatus = securityAudit?.status === "FAIL" || dependencySecurity === "FAIL" ? "FAIL" : securityAudit?.status === "PASS WITH WARNINGS" || dependencySecurity === "PASS WITH WARNINGS" ? "PASS WITH WARNINGS" : securityAudit?.status ?? "FAIL";
  console.log(`Security ........... ${securityStatus}`);
  console.log(`Lint ............... ${statusOf("Lint")}`);
  console.log(`TypeScript ......... ${statusOf("TypeScript")}`);
  console.log(`Tests .............. ${options.full ? statusOf("Full tests") : "SKIPPED"}`);
  console.log(`Build .............. ${statusOf("Build")}`);
  console.log("");
  console.log(`Overall ............ ${ready ? "READY" : "NOT READY"}`);
  console.log(`Reports ............ ${reportsRoot}`);
  console.log("==================================================");
}

async function main() {
let options: Options;
try {
  options = parseOptions(process.argv.slice(2));
} catch (error) {
  options = { full: false, migrate: false, skipInstall: false, skipBuild: false, dryRun: false, help: false };
  failure = error instanceof Error ? error : new Error(String(error));
}

if (options.help && !failure) {
  printHelp();
  process.exit(0);
}

try {
  if (failure) throw failure;
  currentStage = "Node 22 guard";
  requireNode22();
  stages.push({ name: "Node 22 guard", status: "PASS", command: "process.versions.node", detail: process.versions.node });

  currentStage = "Repository validation";
  for (const required of ["package.json", "tsconfig.json", "src", "supabase"]) {
    if (!existsSync(join(repoRoot, required))) throw new Error(`Required repository path is missing: ${required}`);
  }
  if (!["next.config.js", "next.config.mjs", "next.config.ts"].some((name) => existsSync(join(repoRoot, name)))) throw new Error("A Next.js configuration file is required.");
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as { engines?: Record<string, string>; scripts?: Record<string, string> };
  if (packageJson.engines?.node !== "22.x" || packageJson.engines?.npm !== ">=10") throw new Error("package.json must require Node 22.x and npm >=10.");
  const scripts = packageJson.scripts ?? {};
  for (const requiredScript of ["lint", "typecheck", "build"]) if (!scripts[requiredScript]) throw new Error(`Required package script is missing: ${requiredScript}`);
  stages.push({ name: "Repository validation", status: "PASS", command: "filesystem and package.json checks", detail: "Required project structure and scripts are present." });

  currentStage = "Tool checks";
  const gitVersion = capture("git", ["--version"]);
  const nodeVersion = capture(process.execPath, ["--version"]);
  const pathNodeVersion = capture("node", ["--version"]);
  if (Number.parseInt(pathNodeVersion.replace(/^v/, "").split(".")[0] ?? "", 10) !== 22) throw new Error(`Child-process PATH does not resolve Node.js 22: ${pathNodeVersion}`);
  const npmVersion = capture(npmExecutable, [...npmPrefix, "--version"]);
  if (options.migrate) capture(npxExecutable, [...npxPrefix, "supabase", "--version"]);
  stages.push({ name: "Tool checks", status: "PASS", command: "git/node/npm version checks", detail: `${gitVersion}; runtime ${nodeVersion}; child PATH ${pathNodeVersion}; npm ${npmVersion}` });

  migrationAudit = auditMigrations(repoRoot, true, reportsRoot);
  if (options.migrate && migrationAudit.status === "FAIL") throw new Error("Migration static audit contains ERROR findings; database push is blocked.");
  securityAudit = runSecurityChecks(repoRoot, true, reportsRoot);
  if (securityAudit.status === "FAIL") throw new Error("Security static checks contain blocking findings.");
  trustAudit = checkTrustInfrastructure(repoRoot, true, reportsRoot);

  currentStage = "Consent source verification";
  const consentManager = readFileSync(join(repoRoot, "src", "components", "consent", "ConsentManager.tsx"), "utf8");
  if (!/const showConsentBanner = ready && decisionState === "undecided";/.test(consentManager)) throw new Error("Consent banner existence is not isolated from synchronization state.");
  if (/decisionState === "undecided" \|\| saving/.test(consentManager)) throw new Error("Unsafe consent banner reopening logic detected.");
  stages.push({ name: "Consent source verification", status: "PASS", command: "static consent state-separation checks", detail: "Local decision state is separate from effective tracking state." });

  const equivalentConsentCoverage = /consent/i.test(scripts.test ?? "");
  for (const target of ["test:cookie-consent", "test:consent"]) {
    if (!scripts[target] && !equivalentConsentCoverage) throw new Error(`Missing ${target} and no equivalent main-suite consent coverage was detected.`);
    if (!scripts[target]) warnings.push(`${target} is missing; equivalent consent coverage is present in npm test.`);
  }

  if (options.dryRun) {
    skip("Dependencies", commandLabel(npmExecutable, [...npmPrefix, "ci"]), "Dry run.");
    if (scripts["test:cookie-consent"]) skip("Cookie-consent tests", commandLabel(npmExecutable, [...npmPrefix, "run", "test:cookie-consent"]), "Dry run.");
    if (scripts["test:consent"]) skip("Consent tests", commandLabel(npmExecutable, [...npmPrefix, "run", "test:consent"]), "Dry run.");
    skip("Lint", commandLabel(npmExecutable, [...npmPrefix, "run", "lint"]), "Dry run.");
    skip("TypeScript", commandLabel(npmExecutable, [...npmPrefix, "run", "typecheck"]), "Dry run.");
    if (options.full) skip("Full tests", commandLabel(npmExecutable, [...npmPrefix, "test"]), "Dry run.");
    skip("Build", commandLabel(npmExecutable, [...npmPrefix, "run", "build"]), "Dry run.");
    if (options.migrate) skip("Supabase migration", commandLabel(npxExecutable, [...npxPrefix, "supabase", "db", "push", "--include-all"]), "Dry run; no database changes performed.");
  } else {
    if (options.skipInstall) skip("Dependencies", commandLabel(npmExecutable, [...npmPrefix, "ci"]), "Explicitly skipped.");
    else await run(npmExecutable, [...npmPrefix, "ci"], "Dependencies");
    await runDependencyAudit();
    if (scripts["test:cookie-consent"]) await run(npmExecutable, [...npmPrefix, "run", "test:cookie-consent"], "Cookie-consent tests");
    if (scripts["test:consent"]) await run(npmExecutable, [...npmPrefix, "run", "test:consent"], "Consent tests");
    await run(npmExecutable, [...npmPrefix, "run", "lint"], "Lint");
    await run(npmExecutable, [...npmPrefix, "run", "typecheck"], "TypeScript");
    if (options.full) await run(npmExecutable, [...npmPrefix, "test"], "Full tests");
    if (options.skipBuild) skip("Build", commandLabel(npmExecutable, [...npmPrefix, "run", "build"]), "Explicitly skipped.");
    else await run(npmExecutable, [...npmPrefix, "run", "build"], "Build");
    if (options.migrate) {
      await run(npxExecutable, [...npxPrefix, "supabase", "db", "push", "--include-all"], "Supabase migration");
      await run(npxExecutable, [...npxPrefix, "supabase", "db", "lint", "--linked", "--level", "error"], "Post-migration verification");
    }
  }
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
  if (!stages.some((stage) => stage.status === "FAIL" && stage.name === currentStage)) {
    stages.push({ name: currentStage, status: "FAIL", command: "release manager", detail: failure.message });
  }
  console.error(failure.message);
}

const ready = finalReports(options);
terminalSummary(ready, options);
process.exitCode = ready ? 0 : 1;
}

void main();
