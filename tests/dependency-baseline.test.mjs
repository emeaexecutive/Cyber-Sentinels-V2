import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

test("the manifest, lockfile, Node, and npm baseline stay deterministic", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  const rootLock = lock.packages[""];

  assert.equal(manifest.engines.node, "22.x");
  assert.equal(manifest.engines.npm, "10.x");
  assert.equal(manifest.packageManager, "npm@10.9.8");
  assert.equal(read(".nvmrc").trim(), "22.23.1");
  assert.equal(read(".node-version").trim(), "22.23.1");
  assert.equal(lock.lockfileVersion, 3);

  for (const section of ["dependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(manifest[section])) {
      assert.equal(rootLock[section][name], version, `${name} must match the lockfile root`);
      assert.ok(lock.packages[`node_modules/${name}`], `${name} must resolve in the lockfile`);
    }
  }
  assert.equal(manifest.dependencies["@worldcoin/idkit"], undefined);
  assert.equal(lock.packages["node_modules/@worldcoin/idkit"], undefined);
});

test("the installed graph has no invalid or unexplained dependency problem", () => {
  assert.ok(process.env.npm_execpath, "the dependency gate must run through npm");
  const graph = JSON.parse(execFileSync(
    process.execPath,
    [process.env.npm_execpath, "ls", "--all", "--json"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  ));
  const allowedOptionalPlatformEntries = [
    /^extraneous: @emnapi\/runtime@[^ ]+ /,
    /^extraneous: @img\/sharp-wasm32@[^ ]+ /,
  ];
  const unexpected = (graph.problems ?? []).filter(
    (problem) => !allowedOptionalPlatformEntries.some((pattern) => pattern.test(problem))
  );

  assert.deepEqual(unexpected, []);
});

test("React, React DOM, and their types remain one compatible runtime", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  const runtimeVersions = new Set();

  assert.equal(manifest.dependencies.react, "19.2.8");
  assert.equal(manifest.dependencies["react-dom"], "19.2.8");
  assert.equal(manifest.devDependencies["@types/react"], "19.2.18");
  assert.equal(manifest.devDependencies["@types/react-dom"], "19.2.4");

  for (const [packagePath, metadata] of Object.entries(lock.packages)) {
    if (/(?:^|node_modules\/)react$/.test(packagePath)) runtimeVersions.add(metadata.version);
  }
  assert.deepEqual([...runtimeVersions], ["19.2.8"]);
  assert.equal(lock.packages["node_modules/react-dom"].version, "19.2.8");
  assert.equal(lock.packages["node_modules/@types/react"].version, "19.2.18");
  assert.equal(lock.packages["node_modules/@types/react-dom"].version, "19.2.4");
  assert.match(lock.packages["node_modules/next"].peerDependencies.react, /\^19\.0\.0/);
  assert.match(lock.packages["node_modules/next"].peerDependencies["react-dom"], /\^19\.0\.0/);
});

test("Stripe 22.4.0 uses the reviewed API version and preserves payment contracts", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");
  const client = read("lib/billing/stripe.ts");
  const checkout = read("app/api/stripe/create-checkout-session/route.ts");
  const portal = read("app/api/stripe/customer-portal/route.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");

  assert.equal(manifest.dependencies.stripe, "22.4.0");
  assert.equal(lock.packages["node_modules/stripe"].version, "22.4.0");
  assert.match(client, /apiVersion:\s*"2026-07-29\.dahlia"/);
  assert.match(checkout, /stripe\.checkout\.sessions\.create/);
  assert.match(checkout, /mode:\s*"subscription"/);
  assert.match(checkout, /customer_email:/);
  assert.match(portal, /stripe\.billingPortal\.sessions\.create/);
  assert.match(webhook, /stripe\.webhooks\.constructEvent/);
  assert.ok(webhook.indexOf("await req.text()") < webhook.indexOf("stripe.webhooks.constructEvent"));
  assert.match(webhook, /reserveStripeEvent/);
  assert.match(webhook, /duplicate:\s*true/);
  assert.match(webhook, /customer\.subscription\.deleted/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.doesNotMatch(webhook, /console\.(?:log|error)\([^\n]*(?:STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET)/);

  const payload = JSON.stringify({ id: "evt_dependency_baseline", object: "event" });
  const secret = "whsec_dependency_baseline_test_only";
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const stripe = new Stripe("sk_test_dependency_baseline", { apiVersion: "2026-07-29.dahlia" });
  assert.equal(stripe.webhooks.constructEvent(payload, signature, secret).id, "evt_dependency_baseline");
});

test("the CSS toolchain remains coordinated with Tailwind and production PostCSS", () => {
  const lock = readJson("package-lock.json");
  const postcss = read("postcss.config.js");
  const tailwind = read("tailwind.config.ts");
  const enterpriseAccess = read("app/enterprise-access/page.tsx");

  assert.equal(lock.packages["node_modules/postcss"].version, "8.5.25");
  assert.equal(lock.packages["node_modules/autoprefixer"].version, "10.5.4");
  assert.equal(lock.packages["node_modules/tailwindcss"].version, "3.4.19");
  assert.match(postcss, /tailwindcss:\s*\{\}/);
  assert.match(postcss, /autoprefixer:\s*\{\}/);
  assert.match(tailwind, /\.\/app\/\*\*\/\*\.\{ts,tsx\}/);
  assert.match(tailwind, /\.\/src\/\*\*\/\*\.\{ts,tsx\}/);
  assert.match(enterpriseAccess, /grid min-w-0 max-w-6xl/);
  assert.equal((enterpriseAccess.match(/<section className="min-w-0/g) ?? []).length, 2);
});

test("GitHub workflows use immutable action pins and least-privilege triggers", () => {
  const workflows = [
    read(".github/workflows/production-verify.yml"),
    read(".github/workflows/secret-scan.yml"),
    read(".github/workflows/codeql.yml"),
  ];
  const combined = workflows.join("\n");
  const dependabot = read(".github/dependabot.yml");
  const references = [...combined.matchAll(/uses:\s*([^@\s]+)@([^\s#]+)/g)];

  assert.ok(references.length >= 8);
  for (const [, action, revision] of references) {
    assert.match(revision, /^[a-f0-9]{40}$/, `${action} must use an immutable commit SHA`);
  }
  assert.doesNotMatch(combined, /pull_request_target/);
  assert.match(workflows[0], /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflows[1], /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflows[1], /fetch-depth:\s*0/);
  assert.match(workflows[1], /gitleaks\/gitleaks-action@[a-f0-9]{40}/);
  assert.match(workflows[2], /actions:\s*read/);
  assert.match(workflows[2], /contents:\s*read/);
  assert.match(workflows[2], /security-events:\s*write/);
  assert.match(workflows[2], /language:\s*\[javascript-typescript\]/);
  for (const group of ["react-ecosystem", "css-toolchain", "development-tooling", "security-actions", "workflow-runtime-actions"]) {
    assert.match(dependabot, new RegExp(`^\\s+${group}:`, "m"));
  }
  assert.doesNotMatch(dependabot, /stripe[\s\S]{0,120}(?:patterns|dependency-type):/i);
});

test("committed security artifacts are portable and describe the locked root", () => {
  const cyclonedxText = read("artifacts/security/cyber-sentinels-sbom.cdx.json");
  const spdxText = read("artifacts/security/cyber-sentinels-sbom.spdx.json");
  const licensesText = read("artifacts/security/dependency-license-inventory.json");
  const combined = `${cyclonedxText}\n${spdxText}\n${licensesText}`;
  const cyclonedx = JSON.parse(cyclonedxText);
  const spdx = JSON.parse(spdxText);
  const licenses = JSON.parse(licensesText);

  assert.equal(cyclonedx.bomFormat, "CycloneDX");
  assert.equal(cyclonedx.metadata.component.name, "cyber-sentinels-v2");
  assert.ok(cyclonedx.components.length > 300);
  assert.equal(spdx.spdxVersion, "SPDX-2.3");
  assert.ok(spdx.documentDescribes.includes("SPDXRef-Package-cyber-sentinels-v2-0.1.0"));
  assert.equal(licenses.rootPackage, "cyber-sentinels-v2@0.1.0");
  assert.equal(licenses.packageCount, cyclonedx.components.length);
  assert.doesNotMatch(combined, /[a-z]:\\(?:users|documents and settings)\\|\/(?:home|users)\//i);
});
