import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityCorrelationId, identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";
import { evaluateProviderCapabilityTruth } from "@/lib/providers/capability-truth";

export async function GET(request: Request) {
  const correlationId = identityCorrelationId(request);
  try {
    const context = await resolveIdentityEnterprise(request);
    const repository = identityRepository();
    const [capabilities, runtime] = await Promise.all([repository.capabilities(context.enterpriseId), repository.providerRuntimeEvidence(context.enterpriseId)]);
    const hopae = inspectHopaeProviderConfig();
    return identitySuccess({ capabilities: capabilities.map((capability) => {
      const providerId = String(capability.provider_id);
      const registry = runtime.registry.find((row) => row.provider_id === providerId);
      const transaction = runtime.transactions.find((row) => row.provider_id === providerId);
      const execution = runtime.executions.find((row) => row.provider_id === providerId && (!transaction?.provider_session_id || row.provider_session_id === transaction.provider_session_id));
      const evidence = runtime.evidence.find((row) => row.provider_id === providerId && (!transaction?.id || row.provider_transaction_id === transaction.id));
      const configured = providerId === "hopae_connect" ? hopae.configured : providerId === "device_context" ? Boolean(process.env.SECURITY_HASH_SECRET) : false;
      const enabled = providerId === "hopae_connect" ? hopae.config.enabled && registry?.enabled === true : false;
      const truth = evaluateProviderCapabilityTruth({
        registered: true,
        configured,
        enabled,
        healthState: registry?.health_status ?? "UNKNOWN",
        transactionReference: transaction?.provider_transaction_id ?? transaction?.provider_session_id ?? null,
        transactionSucceeded: transaction?.status === "SUCCEEDED" || execution?.status === "completed",
        signatureVerified: execution?.signature_status === "verified",
        idempotencyVerified: execution?.idempotency_status === "unique" || execution?.idempotency_status === "duplicate",
        normalizedEvidencePersisted: Boolean(execution?.normalized_evidence_reference),
        serverVerifiedEvidence: evidence?.signal_status === "PASS"
          && evidence?.server_verified === true
          && evidence?.signature_verified === true
          && evidence?.outcome === "VERIFIED"
          && Boolean(evidence?.provider_reference)
          && Boolean(evidence?.provider_transaction_id)
          && Boolean(evidence?.source_digest),
        blockers: [
          ...(Array.isArray(transaction?.limitations) ? transaction.limitations : []),
          ...(providerId === "world_id" ? ["WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED"] : []),
          ...(!["hopae_connect", "device_context", "world_id"].includes(providerId) ? ["No transactional provider adapter is configured."] : []),
        ],
      });
      return {
        ...capability,
        runtime_status: providerId === "hopae_connect" ? (!hopae.config.enabled ? "DISABLED" : hopae.configured ? (registry?.health_status === "HEALTHY" ? "AVAILABLE" : "BLOCKED_BY_EXTERNAL_CONFIGURATION") : "BLOCKED_BY_CREDENTIALS") : capability.runtime_status,
        configurationPresent: configured,
        capabilityTruth: truth,
        lastRuntimeEvidenceAt: execution?.updated_at ?? registry?.last_health_check ?? transaction?.created_at ?? null,
      };
    }), truthNotice: "Provider maturity is an ordered evidence set. Registration or configuration alone never implies a transaction, signed assertion, or server-verified identity result." }, 200, correlationId);
  } catch (error) { return identityFailure(error, correlationId); }
}
