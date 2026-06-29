import "server-only";

import { NextResponse } from "next/server";
import {
  buildWorkflowAccessDecision,
  loadAccessGovernanceOverview,
} from "@/lib/access-governance";
import { requireAdminApiAccess } from "@/lib/auth/isAdmin";
import { loadWorkflowTrust, validReference } from "@/lib/operational-trust/api";
import { createClient } from "@/lib/supabase/server";

export async function accessGovernanceResponse(
  request: Request,
  mode: "governance" | "history" | "access_state" | "authorization"
) {
  const supabase = await createClient();
  const access = await requireAdminApiAccess(request, supabase);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const workflowId = url.searchParams.get("workflow_id") ?? "";
  const subjectType = url.searchParams.get("subject_type") ?? undefined;

  if (!workflowId && mode === "governance") {
    const overview = await loadAccessGovernanceOverview(supabase);
    return NextResponse.json({
      ok: true,
      schemaVersion: 1,
      generatedAt: overview.generatedAt,
      metrics: overview.metrics,
      workflows: overview.workflows,
      boundary: overview.boundary,
    });
  }
  if (!validReference(workflowId)) {
    return NextResponse.json(
      { ok: false, schemaVersion: 1, error: "valid_workflow_id_required" },
      { status: 400 }
    );
  }

  try {
    const trust = await loadWorkflowTrust(supabase, workflowId, subjectType);
    const decision = buildWorkflowAccessDecision(trust);
    const payload =
      mode === "history"
        ? {
            workflow: decision.workflow,
            authorizationLineage: decision.authorizationLineage,
            governanceHistory: decision.governanceHistory,
            replayReference: decision.replayReference,
            trustPosture: decision.trustPosture,
          }
        : mode === "access_state"
          ? {
              workflow: decision.workflow,
              accessState: decision.accessState,
              trustPosture: decision.trustPosture,
              explanation: decision.explanation,
              replayLinked: decision.replayLinked,
            }
          : decision;

    return NextResponse.json({
      ok: true,
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      ...payload,
      boundary: decision.boundary,
    });
  } catch {
    return NextResponse.json(
      { ok: false, schemaVersion: 1, error: "access_governance_history_unavailable" },
      { status: 500 }
    );
  }
}
