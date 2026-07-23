import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

type TrustCheck = { concept: string; patterns: RegExp[]; files: string[] };
export type TrustInfrastructureAudit = { status: "PASS" | "PASS WITH WARNINGS"; checks: TrustCheck[]; reportPath: string };

export function checkTrustInfrastructure(repoRoot = process.cwd(), writeReport = true): TrustInfrastructureAudit {
  const listed = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "app", "components", "lib", "src"], { cwd: repoRoot, encoding: "utf8", shell: false });
  if (listed.status !== 0) throw new Error("Unable to enumerate implementation files for trust-infrastructure checks.");
  const sources = listed.stdout.split("\0").filter((file) => /\.(?:ts|tsx|js|mjs)$/i.test(file) && existsSync(join(repoRoot, file)));
  const definitions: Array<Omit<TrustCheck, "files">> = [
    { concept: "Trust Memory", patterns: [/trust memory/i, /trust_memory/i, /trustMemory/] },
    { concept: "Replay", patterns: [/\breplay\b/i, /trust_replay/i] },
    { concept: "Evidence Graph", patterns: [/evidence graph/i, /evidence_graph/i, /evidenceGraph/] },
    { concept: "Authority Lineage", patterns: [/authority lineage/i, /authority graph/i, /delegat(?:ed|ion).{0,30}authority/i] },
    { concept: "Decision Intelligence", patterns: [/decision intelligence/i, /decision-intelligence/i, /decisionIntelligence/] },
    { concept: "Continuous Trust", patterns: [/continuous trust/i, /continuous-trust/i, /continuous_trust/i] },
    { concept: "Enterprise Trust Fabric", patterns: [/enterprise trust fabric/i, /trust fabric/i, /trust-fabric/i, /trustFabric/] },
  ];
  const checks = definitions.map((definition) => ({
    ...definition,
    files: sources.filter((file) => {
      const text = readFileSync(join(repoRoot, file), "utf8");
      return definition.patterns.some((pattern) => pattern.test(text));
    }),
  }));
  const missing = checks.filter((check) => check.files.length === 0);
  const status: TrustInfrastructureAudit["status"] = missing.length ? "PASS WITH WARNINGS" : "PASS";
  const reportPath = join(repoRoot, "reports", "TrustInfrastructureReport.md");
  if (writeReport) {
    mkdirSync(join(repoRoot, "reports"), { recursive: true });
    const lines = [
      "# Trust infrastructure report",
      "",
      `- Timestamp: ${new Date().toISOString()}`,
      `- Status: ${status}`,
      "- Checks: existing implementation references in app, components, lib, and src",
      `- Exact failure stage: ${missing.length ? "None; implementation-reference warnings only" : "None"}`,
      `- Actionable remediation: ${missing.length ? "Confirm whether missing concepts are planned or incomplete; do not create empty marketing modules to manufacture a pass." : "Preserve these implementation paths during release."}`,
      "- Limitation: Reference presence does not prove production correctness or complete feature operation.",
      "",
      "## Implementation evidence",
      "",
      ...checks.map((check) => check.files.length
        ? `- **${check.concept}: PRESENT** — ${check.files.length} implementation file(s), including ${check.files.slice(0, 4).map((file) => `\`${file}\``).join(", ")}.`
        : `- **${check.concept}: PLANNED OR INCOMPLETE** — no implementation reference detected.`),
      "",
    ];
    writeFileSync(reportPath, lines.join("\n"), "utf8");
  }
  return { status, checks, reportPath };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(join(process.cwd(), "tools", "release", "trust-infrastructure-checks.ts"))) {
  const result = checkTrustInfrastructure();
  console.log(`Trust infrastructure checks: ${result.status}. Report: ${result.reportPath}`);
}
