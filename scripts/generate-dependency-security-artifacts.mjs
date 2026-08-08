import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "artifacts", "security");
const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const lockText = readFileSync(path.join(root, "package-lock.json"), "utf8");
const lock = JSON.parse(lockText);
const lockDigest = createHash("sha256").update(lockText).digest("hex");
const npmCli = process.env.npm_execpath;

if (!npmCli || !existsSync(npmCli)) {
  throw new Error("Run SBOM generation through `npm run security:sbom` so the pinned npm CLI is available.");
}

mkdirSync(outputDirectory, { recursive: true });

function npmSbom(format) {
  const stdout = execFileSync(
    process.execPath,
    [npmCli, "sbom", "--package-lock-only", "--sbom-format", format, "--sbom-type", "application"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  return JSON.parse(stdout);
}

function assertPortable(label, value) {
  const serialized = JSON.stringify(value);
  const forbidden = [root, process.env.USERPROFILE, process.env.HOME]
    .filter(Boolean)
    .map((entry) => path.resolve(entry).toLowerCase());
  const normalized = serialized.replaceAll("\\\\", "/").toLowerCase();

  if (forbidden.some((entry) => normalized.includes(entry.replaceAll("\\", "/")))) {
    throw new Error(`${label} contains a local absolute path.`);
  }
  if (/[a-z]:\\(?:users|documents and settings)\\/i.test(serialized) || /\/(?:home|users)\//i.test(serialized)) {
    throw new Error(`${label} contains a user-home path.`);
  }
}

function writeJson(filename, value) {
  assertPortable(filename, value);
  writeFileSync(path.join(outputDirectory, filename), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const cyclonedx = npmSbom("cyclonedx");
delete cyclonedx.serialNumber;
delete cyclonedx.metadata.timestamp;
cyclonedx.metadata.component.name = manifest.name;
writeJson("cyber-sentinels-sbom.cdx.json", cyclonedx);

const spdx = npmSbom("spdx");
spdx.documentNamespace = `https://cybersentinels.example/sbom/${lockDigest}`;
spdx.creationInfo.created = "2026-08-05T00:00:00.000Z";
writeJson("cyber-sentinels-sbom.spdx.json", spdx);

function packageNameFromPath(packagePath) {
  return packagePath.split("node_modules/").at(-1).replaceAll("\\", "/");
}

function classifyLicense(license) {
  if (!license) return "unknown";
  if (/\b(?:AGPL|GPL)-/i.test(license)) return "strong-copyleft";
  if (/\b(?:SSPL|BUSL)/i.test(license)) return "source-available";
  if (/\b(?:LGPL|MPL)-/i.test(license)) return "reciprocal";
  if (/^(?:MIT|Apache-2\.0|ISC|BSD-[23]-Clause|0BSD|BlueOak-1\.0\.0|CC0-1\.0|CC-BY-4\.0|Python-2\.0)(?:\s+(?:AND|OR)\s+(?:MIT|Apache-2\.0|ISC|BSD-[23]-Clause|0BSD|BlueOak-1\.0\.0|CC0-1\.0|CC-BY-4\.0|Python-2\.0))*$/i.test(license)) {
    return "permissive";
  }
  return "custom";
}

const packages = Object.entries(lock.packages)
  .filter(([packagePath]) => packagePath)
  .map(([packagePath, metadata]) => ({
    name: packageNameFromPath(packagePath),
    version: metadata.version ?? "UNKNOWN",
    path: packagePath.replaceAll("\\", "/"),
    direct: packagePath.split("node_modules/").length === 2,
    development: metadata.dev === true,
    optional: metadata.optional === true,
    license: metadata.license ?? "UNKNOWN",
    classification: classifyLicense(metadata.license),
    integrity: metadata.integrity ?? null,
  }))
  .sort((left, right) => left.path.localeCompare(right.path));

const classifications = packages.reduce((counts, entry) => {
  counts[entry.classification] = (counts[entry.classification] ?? 0) + 1;
  return counts;
}, {});

writeJson("dependency-license-inventory.json", {
  schemaVersion: 1,
  rootPackage: `${manifest.name}@${manifest.version}`,
  lockfileVersion: lock.lockfileVersion,
  lockfileSha256: lockDigest,
  packageCount: packages.length,
  classifications,
  packages,
});

console.log(`Generated CycloneDX, SPDX, and licence inventory artifacts for ${packages.length} locked packages.`);
