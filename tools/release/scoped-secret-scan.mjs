#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".sql", ".md", ".json", ".yml", ".yaml", ".ps1", ".sh", ".txt", ".example"]);
const excluded = /(^|\/)(node_modules|\.next|coverage|playwright-report|test-results|\.git)(\/|$)|package-lock\.json$|\.map$/;
const patterns = [
  ["PRIVATE_KEY", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["GITHUB_TOKEN", /(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ["AWS_ACCESS_KEY", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ["STRIPE_LIVE_SECRET", /(?:sk|rk)_live_[A-Za-z0-9]{16,}/],
  ["SUPABASE_SECRET", /sb_secret_[A-Za-z0-9_-]{16,}/],
  ["PUBLIC_API_KEY", /cs_(?:test|live)_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}/],
  ["SENSITIVE_ASSIGNMENT", /(?:SUPABASE_SERVICE_ROLE_KEY|PUBLIC_API_KEY_ROTATION_SECRET|TURNSTILE_SECRET_KEY|CYBER_SENTINELS_API_KEY|STRIPE_SECRET_KEY|OPENAI_API_KEY)\s*=\s*["']?[^\s"'<>]{16,}/],
];

function files() {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" });
  return output.split("\0").filter(Boolean).filter((path) => !excluded.test(path.replaceAll("\\", "/")))
    .filter((path) => allowedExtensions.has(extname(path).toLowerCase()) || path.endsWith(".env.example"));
}

function classification(path, line) {
  const normalized = path.replaceAll("\\", "/");
  if (/^(tests|test|fixtures)\//.test(normalized) || /(?:fixture|synthetic|test[-_ ]only)/i.test(line)) return "TEST_FIXTURE";
  if (/^(docs|examples)\//.test(normalized) || normalized.endsWith(".example") || /<[^>]+>|xxxxx|change_this/i.test(line)) return "EXAMPLE_PLACEHOLDER";
  return "REAL_SECRET_CANDIDATE";
}

const findings = [];
for (const path of files()) {
  let source;
  try { source = readFileSync(path, "utf8"); } catch { continue; }
  source.split(/\r?\n/).forEach((line, index) => {
    for (const [pattern, expression] of patterns) {
      if (expression.test(line)) findings.push({ file: path.replaceAll("\\", "/"), line: index + 1, pattern, classification: classification(path, line) });
    }
  });
}

const realCandidates = findings.filter((finding) => finding.classification === "REAL_SECRET_CANDIDATE");
console.log(JSON.stringify({
  status: realCandidates.length ? "FAILED" : "PASSED",
  scope: "tracked-and-untracked-nonignored-release-text",
  values_emitted: false,
  totals: {
    findings: findings.length,
    real_secret_candidates: realCandidates.length,
    test_fixtures: findings.filter((finding) => finding.classification === "TEST_FIXTURE").length,
    example_placeholders: findings.filter((finding) => finding.classification === "EXAMPLE_PLACEHOLDER").length,
  },
  findings,
}, null, 2));
if (realCandidates.length) process.exitCode = 1;
