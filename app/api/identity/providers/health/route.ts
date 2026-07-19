import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { HopaeAdapter } from "@/lib/providers/adapters/hopae/hopae-adapter";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = identityCorrelationId(request);
  try {
    const context = await resolveIdentityEnterprise(request);
    const [runtime, config] = await Promise.all([
      identityRepository().providerRuntimeEvidence(context.enterpriseId),
      Promise.resolve(inspectHopaeProviderConfig()),
    ]);
    const checkedAt = new Date().toISOString();
    const hopaeRuntime = config.configured
      ? await new HopaeAdapter({ correlationId }).healthCheck()
      : { configured: false, enabled: config.config.enabled, state: config.config.enabled ? "MISCONFIGURED" : "DISABLED", checkedAt, latencyMs: null };
    const transaction = runtime.transactions.find((row) => row.provider_id === "hopae_connect");
    const execution = runtime.executions.find((row) => row.provider_id === "hopae_connect" && (!transaction?.provider_session_id || row.provider_session_id === transaction.provider_session_id));
    const evidence = runtime.evidence.find((row) => row.provider_id === "hopae_connect" && (!transaction?.id || row.provider_transaction_id === transaction.id));
    const signatureCapability = execution?.signature_status === "verified"
      && ["unique", "duplicate"].includes(execution.idempotency_status)
      && Boolean(execution.normalized_evidence_reference);
    const serverVerificationCapability = signatureCapability
      && evidence?.signal_status === "PASS"
      && evidence?.outcome === "VERIFIED"
      && evidence?.server_verified === true
      && evidence?.signature_verified === true
      && Boolean(evidence?.provider_reference)
      && Boolean(evidence?.source_digest);
    const hopaeReasonCodes = [
      ...(!config.config.enabled ? ["HOPAE_DISABLED"] : []),
      ...(config.config.enabled && !config.configured ? ["HOPAE_CREDENTIALS_OR_CONFIGURATION_MISSING"] : []),
      ...(hopaeRuntime.state === "UNAVAILABLE" ? ["HOPAE_HEALTH_CHECK_FAILED"] : []),
      ...(!signatureCapability ? ["SIGNED_RUNTIME_EVIDENCE_NOT_PROVEN"] : []),
      ...(!serverVerificationCapability ? ["SERVER_VERIFIED_RUNTIME_EVIDENCE_NOT_PROVEN"] : []),
    ];
    const hopae = {
      providerId: "hopae_connect",
      registered: true,
      configured: config.configured,
      enabled: config.config.enabled,
      state: hopaeRuntime.state,
      lastCheck: hopaeRuntime.checkedAt,
      responseTimeMs: hopaeRuntime.latencyMs,
      transactionalReadiness: config.configured && config.config.enabled && hopaeRuntime.state === "HEALTHY",
      signatureCapability,
      serverVerificationCapability,
      reasonCodes: hopaeReasonCodes,
      blockers: hopaeReasonCodes,
    };
    const worldId = {
      providerId: "world_id",
      registered: true,
      configured: false,
      enabled: false,
      state: "BLOCKED",
      lastCheck: checkedAt,
      responseTimeMs: null,
      transactionalReadiness: false,
      signatureCapability: false,
      serverVerificationCapability: false,
      serverVerified: false,
      confidence: 0,
      reasonCodes: ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"],
      blockers: ["Proof received — server verification pending"],
    };
    const placeholders = ["email", "phone", "ip_reputation", "network_anonymity", "geolocation", "device_context"].map((providerId) => ({
      providerId,
      registered: true,
      configured: providerId === "device_context" ? Boolean(process.env.SECURITY_HASH_SECRET) : false,
      enabled: false,
      state: providerId === "device_context" ? "INCONCLUSIVE" : "UNAVAILABLE",
      lastCheck: checkedAt,
      responseTimeMs: null,
      transactionalReadiness: false,
      signatureCapability: false,
      serverVerificationCapability: false,
      serverVerified: false,
      confidence: 0,
      reasonCodes: [providerId === "device_context" ? "CLIENT_REPORTED_DEVICE_CONTEXT" : "PROVIDER_ADAPTER_NOT_IMPLEMENTED"],
      blockers: [providerId === "device_context" ? "Device context is non-verifying." : "No transactional provider adapter is configured."],
    }));
    return identitySuccess({ providers: [hopae, worldId, ...placeholders] }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}
