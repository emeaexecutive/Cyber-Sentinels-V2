import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";

type SecurityLevel = "ERROR" | "WARNING" | "INFO";
export type SecurityFinding = { level: SecurityLevel; check: string; file: string; detail: string };
export type SecurityAudit = { status: "PASS" | "PASS WITH WARNINGS" | "FAIL"; findings: SecurityFinding[]; reportPath: string };

function trackedFiles(repoRoot: string) {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: repoRoot, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error("Unable to enumerate tracked files for security checks.");
  return result.stdout.split("\0").filter(Boolean);
}

export function runSecurityChecks(repoRoot = process.cwd(), writeReport = true, reportsRoot = join(repoRoot, "reports")): SecurityAudit {
  const findings: SecurityFinding[] = [];
  const files = trackedFiles(repoRoot);
  const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".sql", ".yml", ".yaml", ".toml", ".ps1"]);
  const productionEnv = files.filter((file) => /^\.env(?:\.production|\.prod)?$/i.test(file) || /(^|\/)\.env\.(production|prod)$/i.test(file));
  for (const file of productionEnv) findings.push({ level: "ERROR", check: "committed-production-env", file, detail: "A production environment file is tracked; values were not read or printed." });

  const gitignorePath = join(repoRoot, ".gitignore");
  const gitignore = existsSync(gitignorePath) ? readFileSync(gitignorePath, "utf8") : "";
  if (!/^\.env\.\*$/m.test(gitignore) || !/^!\.env\.example$/m.test(gitignore)) {
    findings.push({ level: "WARNING", check: "environment-ignore", file: ".gitignore", detail: "Add broad .env.* coverage while explicitly allowing a redacted .env.example." });
  }

  let secureCookieEvidence = false;
  for (const file of files) {
    const extension = extname(file).toLowerCase();
    if (!textExtensions.has(extension) || file === "package-lock.json" || file.startsWith("reports/")) continue;
    const absolute = join(repoRoot, file);
    if (!existsSync(absolute)) continue;
    const source = readFileSync(absolute, "utf8");
    if (/\b(?:sk_live_[a-zA-Z0-9]{16,}|rk_live_[a-zA-Z0-9]{16,}|AKIA[0-9A-Z]{16}|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.)/.test(source)) {
      findings.push({ level: "ERROR", check: "hard-coded-secret", file, detail: "A credential-shaped literal was detected and redacted from this report." });
    }
    if (/access-control-allow-origin["']?\s*[:,]\s*["']\*["']/i.test(source)) {
      findings.push({ level: "WARNING", check: "wildcard-cors", file, detail: "Wildcard CORS appears to be configured; confirm this endpoint is intentionally public." });
    }
    if (/^[\s\r\n]*["']use client["'];?/m.test(source) && /SUPABASE_SERVICE_ROLE_KEY|createServiceRoleClient/.test(source)) {
      findings.push({ level: "ERROR", check: "client-service-role", file, detail: "Client code references service-role credentials or a service-role client." });
    }
    if (/secure\s*:\s*process\.env\.NODE_ENV\s*===\s*["']production["']|;\s*Secure/i.test(source)) secureCookieEvidence = true;
    if (/\b(?:AUTH_BYPASS|DISABLE_AUTH|SKIP_AUTH)\b\s*[:=]\s*(?:true|["']true["'])/i.test(source)) {
      findings.push({ level: "ERROR", check: "auth-bypass", file, detail: "An enabled authentication-bypass flag was detected." });
    }
    if (/^app\/api\/(?:debug|test|demo)(?:\/|$)/i.test(file)) {
      findings.push({ level: "WARNING", check: "debug-route", file, detail: "A debug, test, or demo API route is tracked; verify production authorization and exposure." });
    }
  }
  if (!secureCookieEvidence) findings.push({ level: "WARNING", check: "secure-cookie", file: "repository", detail: "No production Secure-cookie evidence was detected by the static pattern check." });

  const errors = findings.filter((item) => item.level === "ERROR").length;
  const warnings = findings.filter((item) => item.level === "WARNING").length;
  const status: SecurityAudit["status"] = errors ? "FAIL" : warnings ? "PASS WITH WARNINGS" : "PASS";
  const reportPath = join(reportsRoot, "SecurityReport.md");
  if (writeReport) {
    mkdirSync(reportsRoot, { recursive: true });
    const lines = [
      "# Security report",
      "",
      `- Timestamp: ${new Date().toISOString()}`,
      `- Status: ${status}`,
      "- Checks: tracked secrets, service-role exposure, committed production environment files, environment ignore rules, wildcard CORS, production cookie security, auth bypass flags, debug routes",
      `- Exact failure stage: ${errors ? "Security static checks" : "None"}`,
      `- Actionable remediation: ${errors ? "Remove and rotate any exposed credential, remove client-side service-role access, and disable bypasses before release." : "Review warnings and confirm each production boundary before release."}`,
      "- Limitation: These static checks are not a security certification, penetration test, or proof that deployed configuration is safe.",
      "- Secret handling: Suspected values are never included in this report.",
      "",
      "## Findings",
      "",
      ...(findings.length ? findings.map((item) => `- **${item.level}** ${item.check} - ${relative(repoRoot, resolve(repoRoot, item.file)).replaceAll("\\", "/") || item.file}: ${item.detail}`) : ["- No findings."]),
      "",
    ];
    writeFileSync(reportPath, lines.join("\n"), "utf8");
  }
  return { status, findings, reportPath };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(join(process.cwd(), "tools", "release", "security-checks.ts"))) {
  const result = runSecurityChecks();
  console.log(`Security checks: ${result.status}. Report: ${result.reportPath}`);
  process.exitCode = result.status === "FAIL" ? 1 : 0;
}
