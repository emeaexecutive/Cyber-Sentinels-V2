import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextDirectory = path.join(root, ".next");
const staticDirectory = path.join(nextDirectory, "static");
const digest = (value) => createHash("sha256").update(value).digest("hex");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

function relative(file) {
  return path.relative(nextDirectory, file).split(path.sep).join("/");
}

const staticFiles = filesUnder(staticDirectory).sort();

function metric(extension) {
  const files = staticFiles.filter((file) => file.endsWith(extension));
  const rows = files.map((file) => `${relative(file)}|${statSync(file).size}|${digest(readFileSync(file))}`);
  return {
    count: files.length,
    bytes: files.reduce((total, file) => total + statSync(file).size, 0),
    aggregateSha256: digest(rows.join("\n")),
  };
}

const appPaths = JSON.parse(readFileSync(path.join(nextDirectory, "server", "app-paths-manifest.json"), "utf8"));
const routes = JSON.parse(readFileSync(path.join(nextDirectory, "routes-manifest.json"), "utf8"));

console.log(JSON.stringify({
  buildId: readFileSync(path.join(nextDirectory, "BUILD_ID"), "utf8").trim(),
  appPathCount: Object.keys(appPaths).length,
  staticRouteCount: routes.staticRoutes.length,
  dynamicRouteCount: routes.dynamicRoutes.length,
  staticFileCount: staticFiles.length,
  staticStructureSha256: digest(staticFiles.map(relative).join("\n")),
  css: metric(".css"),
  javascript: metric(".js"),
  lockfileSha256: digest(readFileSync(path.join(root, "package-lock.json"))),
}, null, 2));
