import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");
const readJson = (relativePath) => JSON.parse(read(relativePath));

function sourceFiles(directory) {
  return readdirSync(path.join(root, directory), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

test("React runtime and type packages remain coordinated at the reviewed versions", () => {
  const manifest = readJson("package.json");
  const lock = readJson("package-lock.json");

  assert.equal(manifest.dependencies.react, "19.2.8");
  assert.equal(manifest.dependencies["react-dom"], "19.2.8");
  assert.equal(manifest.devDependencies["@types/react"], "^19.2.18");
  assert.equal(manifest.devDependencies["@types/react-dom"], "^19.2.4");

  assert.equal(lock.packages["node_modules/react"].version, "19.2.8");
  assert.equal(lock.packages["node_modules/react-dom"].version, "19.2.8");
  assert.equal(lock.packages["node_modules/@types/react"].version, "19.2.18");
  assert.equal(lock.packages["node_modules/@types/react-dom"].version, "19.2.4");
  assert.match(lock.packages["node_modules/next"].peerDependencies.react, /\^19\.0\.0/);
  assert.match(lock.packages["node_modules/next"].peerDependencies["react-dom"], /\^19\.0\.0/);
});

test("client boundaries and Server Actions retain explicit ownership", () => {
  for (const clientFile of [
    "app/login/page.tsx",
    "components/global-navigation.tsx",
    "components/turnstile-field.tsx",
    "components/waitlist-form.tsx",
  ]) {
    assert.match(read(clientFile), /^"use client";/, `${clientFile} must remain a client boundary`);
  }

  for (const actionFile of [
    "app/data-rights/page.tsx",
    "app/trust-replay/page.tsx",
    "app/workspace/page.tsx",
    "app/workspace/[id]/page.tsx",
  ]) {
    assert.match(read(actionFile), /"use server";/, `${actionFile} must retain a Server Action`);
  }
});

test("critical auth, Turnstile, Stripe, form, and recovery contracts remain present", () => {
  const login = read("app/login/page.tsx");
  const turnstile = read("components/turnstile-field.tsx");
  const stripe = `${read("app/api/stripe/create-checkout-session/route.ts")}\n${read("app/api/stripe/customer-portal/route.ts")}\n${read("app/api/stripe/webhook/route.ts")}`;

  assert.match(login, /createClient/);
  assert.match(login, /\/api\/auth\/turnstile/);
  assert.match(turnstile, /turnstile\.render/);
  assert.match(turnstile, /onTokenChange/);
  assert.match(turnstile, /cf-turnstile-response/);
  assert.match(stripe, /createStripeClient/);
  assert.match(stripe, /constructEvent/);

  for (const boundary of [
    "app/error.tsx",
    "app/loading.tsx",
    "app/dashboard/trust-runtime/error.tsx",
    "app/dashboard/trust-runtime/loading.tsx",
  ]) {
    assert.equal(existsSync(path.join(root, boundary)), true, `${boundary} must exist`);
  }
});

test("representative upgraded surfaces and APIs remain routable", () => {
  for (const route of [
    "app/page.tsx",
    "app/login/page.tsx",
    "app/dashboard/page.tsx",
    "app/(enterprise)/trust-centre/page.tsx",
    "app/enterprise-access/page.tsx",
    "app/pro-waitlist/page.tsx",
    "app/pricing/page.tsx",
    "app/demo/page.tsx",
    "app/admin/page.tsx",
  ]) {
    assert.equal(existsSync(path.join(root, route)), true, `${route} must exist`);
  }

  const source = [...sourceFiles("app"), ...sourceFiles("components")]
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /ReactDOM\.render|findDOMNode|ReactDOM\.hydrate\s*\(/);
});
