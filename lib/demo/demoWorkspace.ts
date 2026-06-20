import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/env";

export const demoWorkspaceSlug = "cyber-sentinels-demo-workspace";
export const demoMetadata = {
  demo: true,
  source: "guided_demo_mode",
  data_safety: "sample_only_no_real_enterprise_data",
};

type DemoClient = SupabaseClient<any, any, any>;

export function createDemoServiceClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnv("guided demo mode");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function bestEffort(label: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.warn(`${label} failed`, error);
  }
}

export async function clearDemoNotifications(supabase: DemoClient) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("metadata->>source", demoMetadata.source);

  if (error) throw error;

  return { notifications_cleared: true };
}

export async function resetDemoWorkspace(supabase: DemoClient) {
  await bestEffort("clear demo notifications", () => clearDemoNotifications(supabase));
  await bestEffort("clear demo intelligence", async () => {
    await supabase.from("operational_intelligence_events").delete().eq("metadata->>source", demoMetadata.source);
  });
  await bestEffort("clear demo receipts", async () => {
    await supabase.from("verification_receipts").delete().eq("evidence_snapshot->>source", demoMetadata.source);
  });
  await bestEffort("clear demo evidence chains", async () => {
    await supabase.from("evidence_chains").delete().contains("evidence", [{ source: demoMetadata.source }]);
  });
  await bestEffort("clear demo replay", async () => {
    await supabase.from("trust_replay_sessions").delete().ilike("generated_by", "guided_demo_mode%");
  });
  await bestEffort("clear demo interview events", async () => {
    await supabase.from("interview_risk_events").delete().eq("signal_source", "guided_demo_sample");
  });
  await bestEffort("clear demo interview signals", async () => {
    await supabase.from("interview_risk_signals").delete().eq("metadata->>source", demoMetadata.source);
  });
  await bestEffort("clear demo sessions", async () => {
    await supabase.from("interview_sessions").delete().eq("metadata->>source", demoMetadata.source);
  });
  await bestEffort("clear demo candidates", async () => {
    await supabase.from("candidate_profiles").delete().eq("metadata->>source", demoMetadata.source);
  });
  await bestEffort("clear demo recruiters", async () => {
    await supabase.from("recruiter_profiles").delete().eq("metadata->>source", demoMetadata.source);
  });
  await bestEffort("clear demo trust cases", async () => {
    await supabase.from("trust_cases").delete().eq("description", "Guided demo trust case for design partner walkthrough.");
  });
  await bestEffort("clear demo workspace", async () => {
    await supabase.from("trust_workspaces").delete().eq("slug", demoWorkspaceSlug);
  });

  return { demo_workspace_reset: true };
}

export async function generateDemoWorkflow(supabase: DemoClient) {
  await resetDemoWorkspace(supabase);

  const now = new Date().toISOString();
  const demoTime = (minutes: number) =>
    new Date(new Date(now).getTime() + minutes * 60_000).toISOString();
  let replaySessionId: string | null = null;
  let verificationReceiptId: string | null = null;
  const { data: workspace, error: workspaceError } = await supabase
    .from("trust_workspaces")
    .insert({
      name: "Cyber Sentinels Demo Workspace",
      slug: demoWorkspaceSlug,
      description:
        "Sample-only workspace for design partner walkthroughs, onboarding and live demos.",
      created_at: now,
    })
    .select("id")
    .single();

  if (workspaceError || !workspace) throw workspaceError;

  const { data: trustCase, error: caseError } = await supabase
    .from("trust_cases")
    .insert({
      workspace_id: workspace.id,
      title: "Sample Candidate Interview Integrity Review",
      description: "Guided demo trust case for design partner walkthrough.",
      status: "in_review",
      priority: "high",
      created_at: now,
    })
    .select("id")
    .single();

  if (caseError || !trustCase) throw caseError;

  const { data: candidate, error: candidateError } = await supabase
    .from("candidate_profiles")
    .insert({
      full_name: "Maya Chen (Synthetic Demo Candidate)",
      email: "maya.chen.demo@cybersentinels.local",
      role_applied_for: "Principal Security Engineer",
      company_name: "Northstar Demo Group",
      verification_status: "partial",
      provenance_status: "partial",
      risk_level: "needs_review",
      metadata: {
        ...demoMetadata,
        walkthrough_step: "sample_candidate",
      },
      created_at: now,
    })
    .select("id")
    .single();

  if (candidateError || !candidate) throw candidateError;

  const { data: recruiter, error: recruiterError } = await supabase
    .from("recruiter_profiles")
    .insert({
      full_name: "Jordan Patel",
      email: "jordan.patel.demo@cybersentinels.local",
      company_name: "Northstar Demo Group",
      organization: "Northstar Demo Group",
      verification_status: "verified",
      metadata: {
        ...demoMetadata,
        walkthrough_step: "sample_recruiter",
      },
      created_at: now,
    })
    .select("id")
    .single();

  if (recruiterError || !recruiter) throw recruiterError;

  const { data: session, error: sessionError } = await supabase
    .from("interview_sessions")
    .insert({
      candidate_profile_id: candidate.id,
      candidate_id: candidate.id,
      recruiter_profile_id: recruiter.id,
      workspace_id: workspace.id,
      title: "Demo Interview Integrity Session",
      status: "pending",
      session_status: "in_review",
      integrity_status: "in_review",
      risk_level: "needs_review",
      metadata: {
        ...demoMetadata,
        walkthrough_step: "hiring_integrity_review",
      },
      created_at: now,
    })
    .select("id")
    .single();

  if (sessionError || !session) throw sessionError;

  await bestEffort("demo interview risk events", async () => {
    await supabase.from("interview_risk_events").insert([
      {
        interview_session_id: session.id,
        signal_type: "identity_verification_partial",
        signal_source: "guided_demo_sample",
        confidence_score: 62,
        risk_reason:
          "Synthetic demo candidate supplied partial identity context. Human review is required before any hiring decision.",
        escalation_required: false,
      },
      {
        interview_session_id: session.id,
        signal_type: "interview_injection_risk",
        signal_source: "guided_demo_sample",
        confidence_score: 87,
        risk_reason:
          "Demo-only channel evidence indicates an interview injection attempt. The workflow is escalated for human review; no production detection claim is made.",
        escalation_required: true,
      },
    ]);
  });

  await bestEffort("demo governance action", async () => {
    await supabase.from("governance_actions").insert([
      {
        subject_type: "interview_session",
        subject_id: session.id,
        action_status: "escalated",
        resolution_notes:
          "Injection risk signal escalated. Reviewer must inspect session evidence before the workflow can continue.",
        created_at: demoTime(3),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        action_status: "rejected",
        resolution_notes:
          "Manual review completed. The suspicious interview session was blocked; no hiring judgment was made about the candidate.",
        resolved_at: demoTime(5),
        created_at: demoTime(4),
      },
    ]);
  });

  await bestEffort("demo timeline", async () => {
    await supabase.from("trust_timeline_events").insert([
      {
        subject_type: "trust_case",
        subject_id: trustCase.id,
        event_type: "demo_trust_case_created",
        event_title: "Demo trust case created",
        event_summary: "Sample trust case opened for a design partner walkthrough.",
        actor_type: "guided_demo_mode",
        metadata: demoMetadata,
        severity: "info",
        created_at: demoTime(0),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_partial_verification",
        event_title: "Partial identity verification recorded",
        event_summary:
          "The synthetic demo candidate completed only part of the identity verification workflow.",
        actor_type: "guided_demo_mode",
        metadata: demoMetadata,
        severity: "review",
        created_at: demoTime(1),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_injection_risk_detected",
        event_title: "Injection risk detected",
        event_summary: "Demo channel evidence triggered an explainable injection-risk flag.",
        actor_type: "guided_demo_mode",
        metadata: demoMetadata,
        severity: "review",
        created_at: demoTime(2),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_governance_escalation",
        event_title: "Governance escalation opened",
        event_summary: "The workflow paused and routed the evidence to a human reviewer.",
        actor_type: "guided_demo_mode",
        metadata: demoMetadata,
        severity: "review",
        created_at: demoTime(3),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_manual_review_completed",
        event_title: "Manual review completed",
        event_summary: "A reviewer inspected identity, session and channel evidence and recorded an accountable action.",
        actor_type: "human_governance",
        metadata: demoMetadata,
        severity: "info",
        created_at: demoTime(4),
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_threat_blocked",
        event_title: "Suspicious session blocked",
        event_summary: "The interview workflow was stopped after human review. This is a session-security outcome, not a candidate trust verdict.",
        actor_type: "human_governance",
        metadata: demoMetadata,
        severity: "info",
        created_at: demoTime(5),
      },
    ]);
  });

  await bestEffort("demo replay", async () => {
    const { data, error } = await supabase.from("trust_replay_sessions").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      replay_summary:
        "Replay available: synthetic candidate, partial verification, injection risk, escalation, manual review and blocked session.",
      generated_by: "guided_demo_mode",
      created_at: demoTime(6),
    }).select("id").single();
    if (error) throw error;
    replaySessionId = data?.id ?? null;
  });

  await bestEffort("demo trust receipt", async () => {
    const { data, error } = await supabase.from("verification_receipts").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      receipt_type: "hiring_security_session_review",
      verification_status: "threat_blocked_after_review",
      confidence_level: "Human reviewed",
      receipt_summary:
        "Manual review completed. A suspicious interview session was blocked after partial identity verification and an injection-risk escalation.",
      evidence_snapshot: {
        ...demoMetadata,
        workspace_id: workspace.id,
        trust_case_id: trustCase.id,
        candidate_profile_id: candidate.id,
        recruiter_profile_id: recruiter.id,
        interview_session_id: session.id,
        human_review: true,
        identity_verification_state: "partial",
        session_integrity_state: "blocked_after_review",
        injection_risk_state: "high_risk_signal_reviewed",
        governance_review_outcome: "threat_blocked",
        reviewer_action: "session_blocked_no_candidate_verdict",
        audit_reference: "demo_manual_review_completed",
      },
      issued_at: demoTime(7),
    }).select("id").single();
    if (error) throw error;
    verificationReceiptId = data?.id ?? null;
  });

  await bestEffort("demo evidence chain", async () => {
    await supabase.from("evidence_chains").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      chain_summary:
        "Sample evidence chain links candidate provenance, recruiter verification, interview signals and governance review.",
      evidence: [
        { ...demoMetadata, type: "candidate_profile", id: candidate.id },
        { ...demoMetadata, type: "recruiter_profile", id: recruiter.id },
        { ...demoMetadata, type: "governance_action", status: "in_review" },
        { ...demoMetadata, type: "trust_receipt", status: "in_review" },
      ],
      created_at: now,
    });
  });

  await bestEffort("demo notifications", async () => {
    await supabase.from("notifications").insert([
      {
        notification_type: "demo_review_ready",
        title: "Demo workflow ready",
        message: "Sample trust case, receipt, replay and hiring integrity review are ready for walkthrough.",
        severity: "info",
        read: false,
        is_read: false,
        metadata: {
          ...demoMetadata,
          workspace_id: workspace.id,
          subject_type: "interview_session",
          subject_id: session.id,
        },
        created_at: now,
      },
    ]);
  });

  await bestEffort("demo audit log", async () => {
    await supabase.from("audit_logs").insert({
      event_type: "demo_workflow_generated",
      actor: "guided_demo_mode",
      metadata: {
        ...demoMetadata,
        workspace_id: workspace.id,
        trust_case_id: trustCase.id,
        interview_session_id: session.id,
      },
      created_at: now,
    });
  });

  return {
    workspace_id: workspace.id,
    trust_case_id: trustCase.id,
    candidate_profile_id: candidate.id,
    recruiter_profile_id: recruiter.id,
    interview_session_id: session.id,
    replay_session_id: replaySessionId,
    verification_receipt_id: verificationReceiptId,
  };
}
