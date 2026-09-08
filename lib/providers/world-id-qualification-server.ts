import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { buildIdentityAdapters } from "@/lib/identity-signals/adapters";
import { orchestrateIdentityVerification } from "@/lib/identity-signals/orchestrator";
import { identityRepository } from "@/lib/identity-signals/repository";
import { createCanonicalTrustTransactionDependencies } from "@/lib/trust-transaction/server";
import { executeCanonicalTrustTransaction } from "@/src/lib/trust-transaction/canonical";
import { orchestrateWorldIdQualification, type WorldIdQualificationInput } from "./world-id-qualification";

export function executeWorldIdQualification(input: WorldIdQualificationInput, context: { supabase: SupabaseClient; user: User }) {
  return orchestrateWorldIdQualification(input, {
    verifyIdentity: async (request) => orchestrateIdentityVerification({
      repository: identityRepository(),
      adapters: buildIdentityAdapters(),
      enterpriseId: request.tenantId,
      subjectId: request.subjectId,
      requestedSignals: ["PROOF_OF_PERSONHOOD"],
      purpose: request.requestedPurpose,
      idempotencyKey: request.idempotencyKey,
      actorId: request.actorId,
      signalInputs: { worldId: request.idkitResponse },
      correlationId: request.correlationId,
    }),
    executeCanonical: async (request) => executeCanonicalTrustTransaction({
      trustObject: { subjectType: request.subjectType, subjectId: request.subjectId },
      operationalEntityId: request.operationalEntityId ?? null,
      action: {
        type: request.requestedAction,
        purpose: request.requestedPurpose,
        resource: request.resource,
        environment: request.environment,
        payloadDigest: request.payloadDigest,
      },
      idempotencyKey: request.idempotencyKey,
      correlationId: request.correlationId,
    }, createCanonicalTrustTransactionDependencies({ ...context, allowExternalExecution: false })),
  });
}
