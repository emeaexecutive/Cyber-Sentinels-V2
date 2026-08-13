import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import test from "node:test";
import { classifyProductRoute, productRouteStatuses } from "../lib/navigation/route-classification.ts";

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = join(dir, entry.name);
    return entry.isDirectory() ? pages(target) : entry.name === "page.tsx" ? [target] : [];
  });
}

function toRoute(file) {
  const parts = relative(join(process.cwd(), "app"), file).split(sep).slice(0, -1).filter((part) => !/^\(.+\)$/.test(part));
  return `/${parts.join("/")}`.replace(/\/$/, "") || "/";
}

test("every App Router page receives one governed product classification", () => {
  const routes = pages(join(process.cwd(), "app")).map(toRoute);
  assert.ok(routes.length > 200, "route inventory unexpectedly shrank");
  for (const route of routes) {
    const result = classifyProductRoute(route);
    assert.ok(productRouteStatuses.includes(result.status), `${route} has no valid status`);
    assert.ok(result.rationale.length > 0, `${route} has no rationale`);
  }
});

test("primary lifecycle routes remain canonical", () => {
  for (const route of ["/dashboard", "/operational-entities", "/trust/transactions/tx-id", "/evidence", "/trust-replay"]) {
    assert.equal(classifyProductRoute(route).status, "CANONICAL_PRODUCT", route);
  }
  assert.equal(classifyProductRoute("/account").status, "AUTH_ACCOUNT");
  assert.equal(classifyProductRoute("/developers").status, "DEVELOPER");
});
