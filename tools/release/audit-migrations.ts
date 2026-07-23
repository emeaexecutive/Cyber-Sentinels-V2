import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import process from "node:process";

export type FindingLevel = "ERROR" | "WARNING" | "INFO";
export type MigrationFinding = { level: FindingLevel; category: string; file: string; detail: string };
export type MigrationAudit = { status: "PASS" | "PASS WITH WARNINGS" | "FAIL"; findings: MigrationFinding[]; filesScanned: number; reportPath: string };

function sqlFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const target = join(directory, entry);
    const details = statSync(target);
    if (details.isDirectory()) files.push(...sqlFiles(target));
    else if (entry.toLowerCase().endsWith(".sql")) files.push(target);
  }
  return files;
}

function occurrences(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

function markdownTimestamp() {
  return new Date().toISOString();
}

export function auditMigrations(repoRoot = process.cwd(), writeReport = true): MigrationAudit {
  const migrationRoot = join(repoRoot, "supabase", "migrations");
  const reportPath = join(repoRoot, "reports", "MigrationReport.md");
  const files = sqlFiles(migrationRoot).sort();
  const findings: MigrationFinding[] = [];
  const names = new Map<string, string[]>();

  for (const file of files) {
    const name = basename(file).toLowerCase();
    names.set(name, [...(names.get(name) ?? []), file]);
    const display = relative(repoRoot, file).replaceAll("\\", "/");
    const sql = readFileSync(file, "utf8");
    if (!sql.trim()) findings.push({ level: "ERROR", category: "empty-migration", file: display, detail: "Migration file is empty." });

    for (const legacy of ["candidate_profile_id", "enterprise_id", "trust_score"] as const) {
      const count = occurrences(sql, new RegExp(`\\b${legacy}\\b`, "gi"));
      if (count > 0) findings.push({ level: "INFO", category: "legacy-reference", file: display, detail: `${legacy}: ${count} reference(s); review context before changing historical SQL.` });
    }

    for (const match of sql.matchAll(/\bdrop\s+(column|table|index)\b[^;]*/gi)) {
      if (!/\bif\s+exists\b/i.test(match[0])) {
        findings.push({ level: "ERROR", category: "unsafe-drop", file: display, detail: `Unguarded DROP ${match[1].toUpperCase()} detected.` });
      }
    }

    for (const statement of sql.split(";")) {
      if (!/\bupdate\b/i.test(statement) || !/\b(candidate_profile_id|enterprise_id|trust_score)\b/i.test(statement)) continue;
      const guarded = /information_schema\.columns|pg_constraint|\bif\s+exists\b|execute\s+\$sql\$/i.test(statement);
      findings.push({
        level: guarded ? "INFO" : "WARNING",
        category: "legacy-update",
        file: display,
        detail: guarded ? "Legacy-sensitive UPDATE is inside an existence-checked block." : "UPDATE references a legacy-sensitive column; verify schema assumptions and backfill safety.",
      });
    }
  }

  for (const [name, duplicates] of names) {
    if (duplicates.length > 1) findings.push({ level: "ERROR", category: "duplicate-filename", file: name, detail: `${duplicates.length} migration files share this filename.` });
  }

  const errors = findings.filter((item) => item.level === "ERROR").length;
  const warnings = findings.filter((item) => item.level === "WARNING").length;
  const status: MigrationAudit["status"] = errors ? "FAIL" : warnings ? "PASS WITH WARNINGS" : "PASS";
  if (writeReport) {
    mkdirSync(join(repoRoot, "reports"), { recursive: true });
    const lines = [
      "# Migration report",
      "",
      `- Timestamp: ${markdownTimestamp()}`,
      `- Status: ${status}`,
      `- Checks: ${files.length} SQL migration file(s); legacy identifiers; destructive drops; legacy-sensitive updates; duplicate filenames; empty files`,
      `- Exact failure stage: ${errors ? "Migration static audit" : "None"}`,
      `- Actionable remediation: ${errors ? "Review ERROR findings before any database push. Add existence guards or remove unsafe destructive operations only through an approved forward migration." : "Review WARNING findings against the target schema before migration."}`,
      "- Limitation: Static analysis does not prove database correctness or successful application to a live project.",
      "",
      "## Findings",
      "",
      ...(findings.length ? findings.map((item) => `- **${item.level}** ${item.category} - ${item.file}: ${item.detail}`) : ["- No findings."]),
      "",
    ];
    writeFileSync(reportPath, lines.join("\n"), "utf8");
  }
  return { status, findings, filesScanned: files.length, reportPath };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(join(process.cwd(), "tools", "release", "audit-migrations.ts"))) {
  const result = auditMigrations();
  console.log(`Migration audit: ${result.status}. Report: ${result.reportPath}`);
  process.exitCode = result.status === "FAIL" ? 1 : 0;
}
