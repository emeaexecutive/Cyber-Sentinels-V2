import process from "node:process";

export const node22FailureMessage = (version: string) =>
  `Cyber Sentinels production validation requires Node.js 22.x.\nDetected: ${version}\nRelease aborted.`;

export function requireNode22(version = process.versions.node) {
  const major = Number.parseInt(version.split(".")[0] ?? "", 10);
  if (major !== 22) throw new Error(node22FailureMessage(version));
  console.log(`Detected Node.js ${version}.`);
  return version;
}
