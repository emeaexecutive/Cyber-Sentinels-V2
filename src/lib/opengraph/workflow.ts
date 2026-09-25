import { isIP } from "node:net";
import { hashCanonical } from "../trust-core/hash.ts";
import { authenticateActor, resolveTenantFromSession, executeCanonicalTrustTransaction, type AuthenticatedTransactionActor, type SessionTenant, type CanonicalTrustTransactionDependencies, type CanonicalTrustTransactionInput } from "../trust-transaction/canonical.ts";
import type { PurposeLineageContext } from "../trust-fabric/purpose-lineage.ts";

/** Bounded metadata operation; other MCP tools require separate qualification. */
export const OPENGRAPH_ACTION = "opengraph.site";
export type OpenGraphRequest = {
  subjectId: string;
  operationalEntityId: string;
  purpose: string;
  environment: string;
  targetUrl: string;
  tool: typeof OPENGRAPH_ACTION;
  idempotencyKey: string;
  delegationReference?: string;
};
export type OpenGraphTargetScope = {
  domains: string[];
  subdomains: string[];
  urls: string[];
  deniedDomains: string[];
};
export type OpenGraphServerContext = {
  requestedAt: string;
  purposeLineage?: Omit<PurposeLineageContext, "declaredPurpose">;
  delegation?: { reference: string; authorization: { decision: "ALLOW" | "REVIEW" | "DENY"; reasonCodes: string[] } };
  targetScope: OpenGraphTargetScope;
};

/** No DNS/network request. All address literals and non-public hostname forms fail closed.
 * DNS rebinding and provider-side redirects cannot be qualified by this lexical check.
 */
export function normalizeOpenGraphTarget(value: string) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value) || value.length > 300 || /[\s\\\u0000-\u001f\u007f]/.test(value)) throw new TypeError("UNSAFE_OPENGRAPH_URL");
  let url: URL;
  try { url = new URL(value); } catch { throw new TypeError("UNSAFE_OPENGRAPH_URL"); }
  const host = url.hostname;
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
    || isIP(host) || host.includes(":") || !host.includes(".") || host.endsWith(".")
    || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)
    || host.split(".").some((label) => label.startsWith("-") || label.endsWith("-") || label.length > 63)
    || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|onion)$/.test(host)
    || host === "metadata.google.internal" || host === "metadata.goog"
    || /%(?:00|0a|0d|2f|5c)/i.test(url.pathname)) throw new TypeError("UNSAFE_OPENGRAPH_URL");
  return { url: url.href, domain: host };
}

/** Additional restrictions, never an authority grant. Canonical exact-target scope still applies. */
export function openGraphTargetInScope(target: ReturnType<typeof normalizeOpenGraphTarget>, scope: OpenGraphTargetScope) {
  const validDomain = (domain: string) => {
    try { return normalizeOpenGraphTarget(`https://${domain}/`).domain === domain; } catch { return false; }
  };
  const domainMatches = (domain: string) => target.domain === domain || target.domain.endsWith(`.${domain}`);
  if ([...scope.domains, ...scope.subdomains, ...scope.deniedDomains].some((domain) => !validDomain(domain))) throw new TypeError("INVALID_OPENGRAPH_TARGET_SCOPE");
  scope.urls.forEach(normalizeOpenGraphTarget);
  if (scope.deniedDomains.some((domain) => validDomain(domain) && domainMatches(domain))) return false;
  return scope.domains.some((domain) => validDomain(domain) && domain === target.domain)
    || scope.subdomains.some((domain) => validDomain(domain) && target.domain !== domain && domainMatches(domain))
    || scope.urls.some((url) => { try { return normalizeOpenGraphTarget(url).url === target.url; } catch { return false; } });
}

export function composeOpenGraphRequest(request: OpenGraphRequest, context: OpenGraphServerContext): CanonicalTrustTransactionInput {
  if (request.tool !== OPENGRAPH_ACTION) throw new TypeError("UNSUPPORTED_OPENGRAPH_TOOL");
  const target = normalizeOpenGraphTarget(request.targetUrl);
  for (const value of [request.purpose, request.environment, request.delegationReference ?? "none"]) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_.:/-]{1,180}$/.test(value)) throw new TypeError("INVALID_OPENGRAPH_REFERENCE");
  }
  if (!Number.isFinite(Date.parse(context.requestedAt))) throw new TypeError("INVALID_OPENGRAPH_TIME");
  if (context.delegation && context.delegation.reference !== request.delegationReference) throw new TypeError("OPENGRAPH_DELEGATION_MISMATCH");
  const inScope = openGraphTargetInScope(target, context.targetScope);
  const delegation = context.delegation?.authorization;
  if (delegation && (!["ALLOW", "REVIEW", "DENY"].includes(delegation.decision) || !delegation.reasonCodes.length
    || delegation.reasonCodes.some((code) => !/^[A-Z0-9_]{1,100}$/.test(code)))) throw new TypeError("INVALID_OPENGRAPH_DELEGATION");
  const reasonCodes = [inScope ? "OPENGRAPH_TARGET_IN_SCOPE" : "OPENGRAPH_TARGET_OUT_OF_SCOPE", ...(delegation?.reasonCodes ?? [])];
  const missingDelegation = Boolean(request.delegationReference && !delegation);
  if (missingDelegation) reasonCodes.push("DELEGATION_EVALUATION_REQUIRED");
  const decision = !inScope || delegation?.decision === "DENY" ? "DENY" : missingDelegation || delegation?.decision === "REVIEW" ? "REVIEW" : "ALLOW";
  const binding = { tool: request.tool, target, subjectId: request.subjectId, operationalEntityId: request.operationalEntityId,
    purpose: request.purpose, environment: request.environment, delegationReference: request.delegationReference ?? null,
    targetScopeDigest: hashCanonical(context.targetScope) };
  return {
    trustObject: { subjectType: "ai_agent", subjectId: request.subjectId }, operationalEntityId: request.operationalEntityId,
    action: { type: request.tool, purpose: request.purpose, resource: target.url, environment: request.environment, payloadDigest: hashCanonical(binding) },
    idempotencyKey: request.idempotencyKey, requestedAt: context.requestedAt,
    managedControl: {
      authorization: { decision, reasonCodes },
      purposeLineage: { ...context.purposeLineage, declaredPurpose: request.purpose },
      externalEffectBoundary: { target: target.url, externalEffect: "NETWORK_EXTERNAL_COMMUNICATION" },
      contextEvidence: [{ providerClass: "APPLICATION_SIGNAL", providerKey: "cyber_sentinels_tool_gateway",
        evidenceType: "OPENGRAPH_TOOL_REQUEST", observedAt: context.requestedAt, outcome: "OBSERVED",
        evidenceDigest: hashCanonical(binding), metadata: { ...binding, qualification: "BLOCKED_EXTERNAL", executionAttempted: false, authorizesInteraction: false } }],
    },
  };
}

/** Server-only composition seam for an authenticated gateway/MCP handler.
 * Resolve context from current server state, never from client assertions.
 * No provider transport is installed: even ALLOW cannot call an arbitrary executor.
 * A duplicate returns historical evidence only; a fresh action needs a fresh key.
 */
export async function governOpenGraphRequest(request: OpenGraphRequest, dependencies: CanonicalTrustTransactionDependencies,
  resolveContext: (request: Readonly<OpenGraphRequest>, session: { actor: AuthenticatedTransactionActor; tenant: SessionTenant }) => Promise<OpenGraphServerContext>) {
  const snapshot = structuredClone(request);
  const actor = await authenticateActor(dependencies);
  const tenant = await resolveTenantFromSession(dependencies, actor);
  const context = await resolveContext(structuredClone(snapshot), { actor, tenant });
  const input = composeOpenGraphRequest(snapshot, context);
  const authority = await dependencies.loadAuthority(tenant.id, "ai_agent", snapshot.subjectId);
  if (!authority.authorityScope?.permittedTools.includes(OPENGRAPH_ACTION)) {
    input.managedControl!.authorization = { decision: "DENY", reasonCodes: [...input.managedControl!.authorization!.reasonCodes, "OPENGRAPH_TOOL_OUT_OF_SCOPE"] };
  }
  return executeCanonicalTrustTransaction(input, {
    ...dependencies,
    authenticateActor: async () => actor,
    resolveTenantFromSession: async () => tenant,
    loadAuthority: async () => authority,
    requestExternalExecution: async () => ({ configured: false, requestReference: null, acknowledgement: null, outcome: null }),
  });
}
