// Source inventory only: markers are navigation aids, never proof of authorization.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(path.join(directory, entry.name))
    : entry.name === "route.ts" ? [path.join(directory, entry.name)] : []));
  return children.flat();
}
const rows = [];
for (const file of (await walk("app/api")).sort()) {
  const source = await readFile(file, "utf8");
  const route = file.replaceAll("\\", "/").replace(/^app/, "").replace(/\/route\.ts$/, "");
  const methods = [...source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)/g)].map((match) => match[1] ?? match[2]);
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]).filter((name) => name.startsWith("@/") || name.startsWith("."));
  const gates = [...new Set(source.match(/withPublicApi|require\w*(?:Access|Auth|Session|User|Admin|Workspace)|checkAdminAccess|auth\.getUser|authenticate\w*|verify\w*Signature|constructEvent|assert\w*Access/g) ?? [])];
  rows.push(`| \`${route}\` | ${[...new Set(methods)].join(", ") || "re-export; inspect source"} | ${gates.join(", ") || "shared dependency / middleware; inspect"} | ${imports.map((name) => `\`${name}\``).join(", ")} |`);
}
await writeFile("docs/V2_API_ROUTE_INVENTORY.md", `# V2 API source inventory\n\n${rows.length} route files, generated with \`node tools/v2-api-inventory.mjs\`.\n\nAll entries exist in source. Gate names are lexical evidence only; absence does not prove an unprotected route and presence does not prove correct tenant binding. Follow the listed imports and the audit's family findings. No live route is certified by this inventory. Re-exported HTTP methods require inspecting the linked module.\n\n| Route | HTTP methods | Direct gate markers | Local implementation imports |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`);
console.log(`Inventoried ${rows.length} API route files.`);
