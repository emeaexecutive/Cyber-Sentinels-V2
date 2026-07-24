import { authenticatedTrustClient, apiError, apiSuccess, loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { replayEngine } from "@/lib/core/replay-engine";
import { ReplayEngine, ReplayRenderer, ReplayService } from "@/src/core/trust/replay";
import { replayCsvResponse, replayFormat, replaySearch } from "@/src/core/trust/replay/http";
import { createReplayRepository } from "@/src/core/trust/replay/supabase-repository";
import {
  trustGraphContext,
  trustGraphCorrelationId,
  trustGraphFailure,
  trustGraphResponse,
  trustGraphUuid,
} from "@/src/core/trust/graph/http";
import {
  trustIntelligenceContext,
  trustIntelligenceCorrelationId,
  trustIntelligenceFailure,
  trustIntelligenceLimit,
  trustIntelligenceResponse,
} from "@/src/core/trust/intelligence/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestedId = (await context.params).id;
  if (request.headers.get("x-enterprise-id") && /^[0-9a-f-]{36}$/i.test(requestedId)) {
    const correlationId = trustGraphCorrelationId(request);
    try {
      const auth = await trustGraphContext(request);
      const entityId = trustGraphUuid(requestedId, "entityId");
      const service = new ReplayService(createReplayRepository(auth.supabase));
      const search = replaySearch(request);
      const format = replayFormat(request);
      if (format === "csv") {
        return replayCsvResponse(
          await service.exportCsv(auth.enterpriseId, entityId, search),
          entityId,
          correlationId,
        );
      }
      const replay =
        format === "audit"
          ? await service.enterpriseAudit(auth.enterpriseId, entityId, search)
          : await service.artifact(auth.enterpriseId, entityId, search);
      return trustGraphResponse({ ok: true, replay }, 200, correlationId);
    } catch (error) {
      return trustGraphFailure(error, correlationId);
    }
  }
  const auth = await authenticatedTrustClient();
  if ("response" in auth) return auth.response;
  const id = requestedId;
  if (!validReference(id)) return apiError("Invalid replay reference.", 400);

  const { data: replay, error: replayError } = await auth.supabase
    .from("trust_replay_sessions")
    .select("id,subject_type,subject_id,replay_summary,generated_by,created_at")
    .eq("id", id)
    .maybeSingle();
  if (replayError) return apiError("Replay lookup could not be completed.", 500);
  if (!replay && request.headers.get("x-enterprise-id")) {
    const correlationId = trustIntelligenceCorrelationId(request);
    try {
      const tenant = await trustIntelligenceContext(request);
      const events = await createReplayRepository(tenant.supabase).findByIdentity(
        tenant.enterpriseId,
        id,
        trustIntelligenceLimit(request),
      );
      const timeline = new ReplayEngine().build(tenant.enterpriseId, id, events);
      return trustIntelligenceResponse(
        { ok: true, timeline, rendered: new ReplayRenderer().render(timeline) },
        200,
        correlationId,
      );
    } catch (error) {
      return trustIntelligenceFailure(error, correlationId);
    }
  }
  if (!replay) return apiError("Replay not found or access is not permitted.", 404);
  if (!replay.subject_id) {
    return apiError("Replay has no workflow subject reference.", 409);
  }

  try {
    const trust = await loadWorkflowTrust(auth.supabase, String(replay.subject_id), replay.subject_type ?? undefined);
    const memory = replayEngine.buildReplayEvidenceMemory(trust);
    return apiSuccess({
      replay,
      entity: {
        type: memory.entity_decision_surface.entity_type,
        authority: memory.entity_decision_surface.authority,
        evidence: memory.entity_decision_surface.evidence,
        trustPosture: memory.entity_decision_surface.trust_posture,
        decision: memory.entity_decision_surface.decision,
        outcome: memory.entity_decision_surface.outcome,
      },
      canonicalEvidence: {
        chronology: memory.chronology,
        evidenceContinuity: memory.evidenceContinuity,
        governanceLineage: memory.governanceLineage,
        trustPosture: memory.trustPosture,
        providerEvidence: memory.providerEvidence,
        receipts: memory.receipts,
      },
      explainability: {
        whatChanged: memory.explainability.whatChanged,
        whyTrustShifted: memory.explainability.whyTrustShifted,
        evidenceReferences: memory.explainability.evidenceContributed,
        reviewerActions: memory.explainability.governanceActions,
        escalationPath: memory.auditability.escalationPath,
        policyAndAuthorizationLineage: memory.auditability.authorizationLineage,
        providerSignals: memory.explainability.providerSignals,
      },
      auditBoundary: memory.auditBoundary,
    });
  } catch {
    return apiError("Replay chronology could not be loaded.", 500);
  }
}
