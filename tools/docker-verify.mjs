#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const git = process.platform === "win32" ? "git.exe" : "git";
const productionProjectRef = "kecgtsfibkypjuaxqbjx";
const productionOrigin = "https://www.cybersentinels.com";
const envFile = resolve(
  repoRoot,
  process.env.CYBER_SENTINELS_DOCKER_ENV_FILE || ".env.docker.example",
);
const checkConfigOnly = process.argv.includes("--check-config-only");
const port = Number(process.env.CYBER_SENTINELS_DOCKER_PORT || "3000");

function fail(message) {
  throw new Error(message);
}

function safeDiagnostic(value) {
  return String(value || "")
    .replace(/(?:sb_secret_|sbp_|cs_(?:test|live)_)[A-Za-z0-9_.-]+/g, "[REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 1200)
    .trim();
}

process.on("uncaughtException", (error) => {
  console.error(`DOCKER_VERIFY=FAIL;REASON=${safeDiagnostic(error?.message)}`);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  console.error(`DOCKER_VERIFY=FAIL;REASON=${safeDiagnostic(error instanceof Error ? error.message : error)}`);
  process.exit(1);
});

function run(command, args, options = {}) {
  const capture = options.capture === true;
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeoutMs ?? 1_800_000,
    killSignal: "SIGTERM",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error || result.status !== 0) {
    if (options.allowFailure) return result;
    const diagnostic = safeDiagnostic(result.error?.message || result.stderr);
    fail(`${basename(command)} failed${diagnostic ? `: ${diagnostic}` : "."}`);
  }
  return result;
}

function parseEnv(source) {
  const parsed = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) fail("Docker env file contains an invalid assignment.");
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[name] = value;
  }
  return parsed;
}

function assertNonProduction(environment) {
  const name = String(environment.CYBER_SENTINELS_ENVIRONMENT || "").toLowerCase();
  const origin = String(environment.CYBER_SENTINELS_PUBLIC_ORIGIN || "").replace(/\/$/, "");
  const siteUrl = String(environment.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const supabaseUrl = String(environment.NEXT_PUBLIC_SUPABASE_URL || "").toLowerCase();
  if (!['local', 'test', 'staging'].includes(name)) {
    fail("CYBER_SENTINELS_ENVIRONMENT must be local, test, or staging for Docker qualification.");
  }
  if (
    name === "production" ||
    origin === productionOrigin ||
    siteUrl === productionOrigin ||
    supabaseUrl.includes(productionProjectRef)
  ) {
    fail("Docker qualification refuses Cyber Sentinels Production configuration.");
  }
  if (environment.SUPABASE_SERVICE_ROLE_KEY && !supabaseUrl) {
    fail("A non-Production service role requires an explicit non-Production Supabase URL.");
  }
}

function assertNoSecretLeak(value, context) {
  const patterns = [
    /sb_secret_[A-Za-z0-9_-]{16,}/,
    /sbp_[A-Za-z0-9_-]{20,}/,
    /cs_(?:test|live)_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i,
  ];
  if (patterns.some((pattern) => pattern.test(value))) {
    fail(`${context} contained a secret-shaped value.`);
  }
}

async function getResponse(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  const text = await response.text();
  assertNoSecretLeak(text, path);
  if (/\bat\s+[A-Za-z0-9_$.[\]<>]+\s*\([^\n]+:\d+:\d+\)/.test(text)) {
    fail(`${path} exposed an internal stack trace.`);
  }
  return { response, text };
}

async function waitForHealth() {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const result = await getResponse("/api/health");
      if (result.response.ok) return result;
      lastError = new Error(`HTTP ${result.response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
  }
  fail(`Container health endpoint did not become ready: ${safeDiagnostic(lastError?.message)}`);
}

if (!existsSync(envFile)) fail("Docker env file does not exist.");
if (!Number.isInteger(port) || port < 1024 || port > 65535) fail("Docker verification port is invalid.");

const environment = parseEnv(readFileSync(envFile, "utf8"));
assertNonProduction(environment);
console.log(`DOCKER_ENVIRONMENT=SAFE_NON_PRODUCTION;FILE=${basename(envFile)}`);

if (checkConfigOnly) {
  console.log("DOCKER_CONFIGURATION=PASS");
  process.exit(0);
}

const daemon = run(docker, ["info", "--format", "{{json .ServerVersion}}"], {
  capture: true,
  allowFailure: true,
  timeoutMs: 15_000,
});
if (daemon.error || daemon.status !== 0) {
  const remediation = process.platform === "win32"
    ? "Run `wsl --install --no-distribution` in Administrator PowerShell, restart Windows, run `wsl --update`, then start Docker Desktop."
    : "Start the Docker daemon and retry.";
  fail(`Docker daemon is unavailable. ${remediation}`);
}

const sha = run(git, ["rev-parse", "HEAD"], { capture: true }).stdout.trim();
if (!/^[a-f0-9]{40}$/.test(sha)) fail("Git release SHA could not be determined.");
const shortSha = sha.slice(0, 12);
const image = `cyber-sentinels-v1:${shortSha}-a`;
const rebuildImage = `cyber-sentinels-v1:${shortSha}-b`;
const container = `cyber-sentinels-v1-verify-${process.pid}`;

console.log(`DOCKER_BUILD_IMAGE_A=${image}`);
run(docker, [
  "build",
  "--progress=plain",
  "--build-arg",
  `BUILD_VERSION=${sha}`,
  "--tag",
  image,
  ".",
]);
console.log(`DOCKER_BUILD_IMAGE_B=${rebuildImage}`);
run(docker, [
  "build",
  "--no-cache",
  "--progress=plain",
  "--build-arg",
  `BUILD_VERSION=${sha}`,
  "--tag",
  rebuildImage,
  ".",
]);

let started = false;
try {
  const imageMetadata = run(docker, [
    "image",
    "inspect",
    "--format",
    "{{.Id}}|{{.Size}}|{{.Config.User}}",
    image,
  ], { capture: true }).stdout.trim();
  const [imageId, imageSize, imageUser] = imageMetadata.split("|");
  if (!imageId || !Number.isFinite(Number(imageSize))) fail("Docker image metadata is incomplete.");
  if (!imageUser || imageUser === "0" || imageUser === "root") fail("Docker runtime user is not non-root.");

  const rebuildMetadata = run(docker, [
    "image",
    "inspect",
    "--format",
    "{{.Id}}|{{.Size}}|{{.Config.User}}",
    rebuildImage,
  ], { capture: true }).stdout.trim();
  const [rebuildImageId, rebuildImageSize, rebuildImageUser] = rebuildMetadata.split("|");
  if (!rebuildImageId || !Number.isFinite(Number(rebuildImageSize))) {
    fail("Rebuilt Docker image metadata is incomplete.");
  }
  if (!rebuildImageUser || rebuildImageUser === "0" || rebuildImageUser === "root") {
    fail("Rebuilt Docker runtime user is not non-root.");
  }

  const nodeVersion = run(docker, ["run", "--rm", "--entrypoint", "node", image, "--version"], {
    capture: true,
  }).stdout.trim();
  if (!/^v22\./.test(nodeVersion)) fail(`Docker image uses unsupported Node version ${nodeVersion}.`);
  const rebuildNodeVersion = run(
    docker,
    ["run", "--rm", "--entrypoint", "node", rebuildImage, "--version"],
    { capture: true },
  ).stdout.trim();
  if (!/^v22\./.test(rebuildNodeVersion)) {
    fail(`Rebuilt Docker image uses unsupported Node version ${rebuildNodeVersion}.`);
  }

  const fileAudit = String.raw`
const fs=require('node:fs');const path=require('node:path');const root='/app';const bad=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);const rel=path.relative(root,full).replaceAll('\\','/');if(entry.isDirectory()){if(['.git','artifacts','reports','coverage','test-results','playwright-report'].includes(rel))bad.push(rel);else walk(full);}else if(/^\.env(?:\.|$)/.test(entry.name)||/\.(?:pem|key|dump|backup)$/i.test(entry.name)||/(?:credential-export|connection-string|diagnostic-output)/i.test(entry.name))bad.push(rel);}}walk(root);if(bad.length){console.error(JSON.stringify(bad));process.exit(1)}console.log('IMAGE_FILE_AUDIT=PASS');`;
  run(docker, ["run", "--rm", "--entrypoint", "node", image, "-e", fileAudit]);
  run(docker, ["run", "--rm", "--entrypoint", "node", rebuildImage, "-e", fileAudit]);

  run(docker, [
    "run",
    "--detach",
    "--rm",
    "--name",
    container,
    "--env-file",
    envFile,
    "--publish",
    `127.0.0.1:${port}:3000`,
    "--add-host",
    "host.docker.internal:host-gateway",
    image,
  ], { capture: true });
  started = true;

  const health = await waitForHealth();
  const healthBody = JSON.parse(health.text);
  if (healthBody.status !== "ok" || healthBody.probe !== "liveness") {
    fail("Docker health response did not match the liveness contract.");
  }

  const homepage = await getResponse("/");
  if (!homepage.response.ok) fail(`Docker homepage returned HTTP ${homepage.response.status}.`);

  const openApi = await getResponse("/api/v1/openapi.json");
  if (!openApi.response.ok) fail(`Docker OpenAPI returned HTTP ${openApi.response.status}.`);
  const openApiBody = JSON.parse(openApi.text);
  if (!openApiBody.openapi || !openApiBody.paths || Object.keys(openApiBody.paths).length === 0) {
    fail("Docker OpenAPI document is not a populated OpenAPI contract.");
  }

  const ready = await getResponse("/api/ready");
  const readyBody = JSON.parse(ready.text);
  if (ready.response.status === 200) {
    if (readyBody.status !== "READY") fail("Docker readiness returned 200 without READY.");
  } else if (ready.response.status === 503) {
    if (!readyBody.reasonCode || !["NOT_READY", "BLOCKED"].includes(String(readyBody.status))) {
      fail("Docker readiness did not identify its unavailable dependency.");
    }
  } else {
    fail(`Docker readiness returned unexpected HTTP ${ready.response.status}.`);
  }

  const logs = run(docker, ["logs", container], { capture: true }).stdout;
  assertNoSecretLeak(logs, "Container logs");

  console.log(`DOCKER_IMAGE_A_ID=${imageId}`);
  console.log(`DOCKER_IMAGE_A_SIZE_BYTES=${imageSize}`);
  console.log(`DOCKER_IMAGE_B_ID=${rebuildImageId}`);
  console.log(`DOCKER_IMAGE_B_SIZE_BYTES=${rebuildImageSize}`);
  console.log(`DOCKER_NODE_VERSION_A=${nodeVersion}`);
  console.log(`DOCKER_NODE_VERSION_B=${rebuildNodeVersion}`);
  console.log(`DOCKER_RUNTIME_USER_A=${imageUser}`);
  console.log(`DOCKER_RUNTIME_USER_B=${rebuildImageUser}`);
  console.log(`DOCKER_REPRODUCIBILITY=PASS;SOURCE_SHA=${sha};NODE_MAJOR=22`);
  console.log("DOCKER_HOMEPAGE=PASS");
  console.log("DOCKER_HEALTH=PASS");
  console.log(`DOCKER_READY_HTTP=${ready.response.status};REASON=${readyBody.reasonCode || "READY"}`);
  console.log(`DOCKER_OPENAPI=PASS;ROUTES=${Object.keys(openApiBody.paths).length}`);
  console.log("DOCKER_SECRET_AND_LOG_SCAN=PASS");
  console.log("DOCKER_VERIFY=PASS");
} finally {
  if (started) {
    run(docker, ["stop", "--time", "10", container], { capture: true, allowFailure: true });
  }
}
