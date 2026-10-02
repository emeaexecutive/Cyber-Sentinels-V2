import assert from "node:assert/strict";
import test from "node:test";
import { executeOpenGraphSite } from "../lib/providers/opengraph-executor.ts";
import { normalizeOpenGraphTarget } from "../src/lib/opengraph/workflow.ts";

const target = normalizeOpenGraphTarget("https://example.com/docs");

test("OpenGraph executor stays unconfigured without an App ID and makes no provider request", async () => {
  let called = false;
  const result = await executeOpenGraphSite(target, { appId: "", fetcher: async () => { called = true; throw new Error("must not fetch"); } });
  assert.equal(called, false);
  assert.equal(result.configured, false);
  assert.equal(result.executionAttempted, false);
  assert.equal(result.providerNetworkBehaviorAssurance, "UNVERIFIED_PROVIDER_CONTROLLED_FETCH");
});

test("OpenGraph executor uses official v3 auth and disables optional proxy, rendering and retries", async () => {
  let calledUrl;
  let calledOptions;
  const result = await executeOpenGraphSite(target, {
    appId: "fixture-app-id",
    now: () => new Date("2026-10-02T12:00:00.000Z"),
    fetcher: async (url, options) => {
      calledUrl = new URL(url);
      calledOptions = options;
      return Response.json({ hybridGraph: { title: "Example", description: "Safe summary", site_name: "Example Site", type: "website" }, requestInfo: { host: "example.com", redirects: 1, responseCode: 200 } });
    },
  });
  assert.equal(calledUrl.origin, "https://opengraph.io");
  assert.equal(calledUrl.pathname, `/api/3.0/site/${encodeURIComponent(target.url)}`);
  assert.equal(calledUrl.searchParams.get("app_id"), "fixture-app-id");
  assert.equal(calledUrl.searchParams.get("auto_proxy"), "false");
  assert.equal(calledUrl.searchParams.get("auto_render"), "false");
  assert.equal(calledUrl.searchParams.get("retry"), "false");
  assert.equal(calledOptions.redirect, "error");
  assert.equal(result.executionAttempted, true);
  assert.equal(result.providerResponseStatus, 200);
  assert.equal(result.normalizedResult.title, "Example");
  assert.equal(result.normalizedResult.redirects, 1);
  assert.equal(result.outcomeCertainty, "UNVERIFIED");
  assert.match(result.evidenceDigest, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(JSON.stringify(result), /fixture-app-id/);
});

test("OpenGraph executor does not follow API redirects or fabricate provider success", async () => {
  const redirected = await executeOpenGraphSite(target, {
    appId: "fixture-app-id",
    fetcher: async (_url, options) => {
      assert.equal(options.redirect, "error");
      throw new TypeError("redirect");
    },
  });
  assert.equal(redirected.executionAttempted, true);
  assert.equal(redirected.normalizedResult, null);
  assert.equal(redirected.failureCode, "TRANSPORT_FAILURE");
  const providerFailure = await executeOpenGraphSite(target, {
    appId: "fixture-app-id",
    fetcher: async () => new Response("failure", { status: 502 }),
  });
  assert.equal(providerFailure.executionAttempted, true);
  assert.equal(providerFailure.providerResponseStatus, 502);
  assert.equal(providerFailure.failureCode, "HTTP_FAILURE");
  assert.match(providerFailure.evidenceDigest, /^[a-f0-9]{64}$/);
});