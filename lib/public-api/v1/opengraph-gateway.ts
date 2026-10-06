import "server-only";

import { PublicApiError } from "./contracts";
import type { PublicApiPrincipal } from "./authentication";
import { getExternalAuthority } from "./runtime";
import { createOpenGraphTestAdapter } from "@/lib/providers/opengraph-test-adapter";
import { executeOpenGraphSite } from "@/lib/providers/opengraph-executor";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  governOpenGraphRequest,
  OPENGRAPH_ACTION,
  type OpenGraphRequest,
  type OpenGraphTargetScope,
} from "@/src/lib/opengraph/workflow";
import { createCanonicalTrustTransactionDependenciesForApiClient } from "@/lib/trust-transaction/server";
import { inspectOpenGraphGatewayInput } from "./opengraph-gateway-input";

const idempotencyPattern = /^[A-Za-z0-9_.:-]{8,180}$/;

export async function requestOpenGraphSite(
  principal: PublicApiPrincipal,
  body: Record<string, unknown>,
  idempotencyKey: string,
) {
  if (process.env.CYBER_SENTINELS_ENVIRONMENT !== "staging") {
    throw new PublicApiError("STAGING_GATEWAY_ONLY", "The OpenGraph gateway is enabled only in the isolated Staging environment.", 403);
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://agpyhygpfmppjkxwcpac.supabase.co") {
    throw new PublicApiError("STAGING_PROJECT_MISMATCH", "The OpenGraph gateway is not bound to the approved Staging project.", 503);
  }

  const parsed = inspectOpenGraphGatewayInput(body);
  const { operationalEntityId, target } = parsed;
  if (!idempotencyPattern.test(idempotencyKey)) {
    throw new PublicApiError("IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.", 400);
  }
  const db = createServiceRoleClient();
  const activeDelegations = await db.from("operational_entity_authority_delegations")
    .select("delegation_id")
    .eq("enterprise_id", principal.tenantId)
    .eq("delegate_operational_entity_id", operationalEntityId)
    .eq("status", "ACTIVE")
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  if (activeDelegations.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Delegated authority could not be resolved safely.", 503);
  if ((activeDelegations.data ?? []).length) {
    const acceptances = await db.from("operational_entity_delegation_acceptances")
      .select("delegation_id")
      .eq("enterprise_id", principal.tenantId)
      .eq("delegate_operational_entity_id", operationalEntityId)
      .in("delegation_id", activeDelegations.data!.map((row) => String(row.delegation_id)));
    if (acceptances.error) throw new PublicApiError("AUTHORITY_UNAVAILABLE", "Delegation acceptance could not be resolved safely.", 503);
    if ((acceptances.data ?? []).length) {
      throw new PublicApiError("DELEGATED_AUTHORITY_PATH_REQUIRED", "Delegated actions must use the governed delegated-authority workflow.", 403);
    }
  }
  const authority = await getExternalAuthority(principal, operationalEntityId);
  const permittedTargets = Array.isArray(authority.targets) ? authority.targets.map(String) : [];
  const targetScope: OpenGraphTargetScope = {
    domains: [],
    subdomains: [],
    urls: permittedTargets,
    deniedDomains: [],
  };
  const environment = "staging";
  const purpose = "read_metadata";
  const request: OpenGraphRequest = {
    subjectId: operationalEntityId,
    operationalEntityId,
    purpose,
    environment,
    targetUrl: target.url,
    tool: OPENGRAPH_ACTION,
    idempotencyKey,
  };
  const dependencies = createCanonicalTrustTransactionDependenciesForApiClient({
    enterpriseId: principal.tenantId,
    clientId: principal.clientId,
  });
  const providerQualified = process.env.OPENGRAPH_PROVIDER_QUALIFIED === "true"
    && Boolean(process.env.OPENGRAPH_APP_ID?.trim());
  const executor = providerQualified ? executeOpenGraphSite : createOpenGraphTestAdapter();

  return governOpenGraphRequest(request, dependencies, async () => ({
    requestedAt: new Date().toISOString(),
    purposeLineage: {
      declaredPurpose: authority.purpose,
      observedPurpose: purpose,
      purposeEvidence: [`api-client:${principal.clientId}`, `authority:${authority.authority_id}`],
      purposeContinuity: "CONFIRMED",
    },
    targetScope,
  }), executor);
}
