import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { normalizeOpenGraphTarget } from "../../src/lib/opengraph/workflow.ts";
import { getOpenGraphAppIdEnv } from "@/lib/env";

const endpoint = "https://opengraph.io/api/3.0/site/";
const responseLimit = 262_144;

export type OpenGraphExecution = {
  configured: boolean;
  provider: "opengraph.io";
  tool: "opengraph.site";
  requestedTarget: string;
  executionAttempted: boolean;
  providerResponseStatus: number | null;
  normalizedResult: { title: string | null; description: string | null; siteName: string | null; type: string | null; responseHost: string | null; redirects: number | null } | null;
  providerNetworkBehaviorAssurance: "UNVERIFIED_PROVIDER_CONTROLLED_FETCH";
  outcomeCertainty: "UNVERIFIED";
  occurredAt: string;
  evidenceDigest: string | null;
  failureCode: "APP_ID_MISSING" | "TRANSPORT_FAILURE" | "RESPONSE_TOO_LARGE" | "HTTP_FAILURE" | "INVALID_RESPONSE" | null;
};

function boundedText(value: unknown) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 500) || null : null;
}

function normalizeResponse(value: unknown): OpenGraphExecution["normalizedResult"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const graph = (body.hybridGraph ?? body.openGraph) as Record<string, unknown> | undefined;
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) return null;
  const info = body.requestInfo && typeof body.requestInfo === "object" ? body.requestInfo as Record<string, unknown> : {};
  const redirects = Number(info.redirects);
  return {
    title: boundedText(graph.title),
    description: boundedText(graph.description),
    siteName: boundedText(graph.site_name),
    type: boundedText(graph.type),
    responseHost: boundedText(info.host),
    redirects: Number.isSafeInteger(redirects) && redirects >= 0 ? redirects : null,
  };
}

export async function executeOpenGraphSite(
  target: ReturnType<typeof normalizeOpenGraphTarget>,
  options: { appId?: string; fetcher?: typeof fetch; now?: () => Date } = {},
): Promise<OpenGraphExecution> {
  let appId = options.appId;
  if (appId === undefined) {
    try { appId = process.env.OPENGRAPH_APP_ID?.trim() ? getOpenGraphAppIdEnv("OpenGraph Site executor") : ""; }
    catch { appId = ""; }
  }
  appId = appId.trim();
  const occurredAt = (options.now?.() ?? new Date()).toISOString();
  const base = {
    provider: "opengraph.io" as const,
    tool: "opengraph.site" as const,
    requestedTarget: target.url,
    providerNetworkBehaviorAssurance: "UNVERIFIED_PROVIDER_CONTROLLED_FETCH" as const,
    outcomeCertainty: "UNVERIFIED" as const,
    occurredAt,
  };
  if (!appId) return { ...base, configured: false, executionAttempted: false, providerResponseStatus: null, normalizedResult: null, evidenceDigest: null, failureCode: "APP_ID_MISSING" };

  const requestUrl = new URL(`${endpoint}${encodeURIComponent(target.url)}`);
  requestUrl.searchParams.set("app_id", appId);
  requestUrl.searchParams.set("auto_proxy", "false");
  requestUrl.searchParams.set("auto_render", "false");
  requestUrl.searchParams.set("retry", "false");
  let response: Response | null = null;
  try {
    response = await (options.fetcher ?? fetch)(requestUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > responseLimit) throw new Error("RESPONSE_TOO_LARGE");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > responseLimit) throw new Error("RESPONSE_TOO_LARGE");
    if (!response.ok) throw new Error("HTTP_FAILURE");
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new Error("INVALID_RESPONSE"); }
    const normalizedResult = normalizeResponse(parsed);
    if (!normalizedResult) throw new Error("INVALID_RESPONSE");
    return {
      ...base,
      configured: true,
      executionAttempted: true,
      providerResponseStatus: response.status,
      normalizedResult,
      evidenceDigest: hashCanonical({ ...base, providerResponseStatus: response.status, normalizedResult }),
      failureCode: null,
    };
  } catch (error) {
    const failureCode = error instanceof Error && ["RESPONSE_TOO_LARGE", "HTTP_FAILURE", "INVALID_RESPONSE"].includes(error.message)
      ? error.message as NonNullable<OpenGraphExecution["failureCode"]>
      : "TRANSPORT_FAILURE";
    const providerResponseStatus = response?.status ?? null;
    return {
      ...base,
      configured: true,
      executionAttempted: true,
      providerResponseStatus,
      normalizedResult: null,
      evidenceDigest: hashCanonical({ ...base, providerResponseStatus, failureCode }),
      failureCode,
    };
  }
}