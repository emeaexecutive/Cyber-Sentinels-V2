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
      full_name: "Maya Chen",
      email: "maya.chen.demo@cybersentinels.local",
      role_applied_for: "Principal Security Engineer",
      company_name: "Northstar Demo Group",
      verification_status: "in_review",
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
        signal_type: "identity_conflict",
        signal_source: "guided_demo_sample",
        confidence_score: 62,
        risk_reason:
          "Sample identity context is incomplete and requires human review before a hiring decision.",
        escalation_required: true,
      },
      {
        interview_session_id: session.id,
        signal_type: "liveness_pending",
        signal_source: "guided_demo_sample",
        confidence_score: 20,
        risk_reason: "Sample liveness step is pending; no detection accuracy is claimed.",
        escalation_required: false,
      },
    ]);
  });

  await bestEffort("demo governance action", async () => {
    await supabase.from("governance_actions").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      action_status: "in_review",
      resolution_notes:
        "Demo governance review: verify candidate provenance, inspect evidence and record a human decision.",
      created_at: now,
    });
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
        created_at: now,
      },
      {
        subject_type: "interview_session",
        subject_id: session.id,
        event_type: "demo_hiring_integrity_review",
        event_title: "Hiring integrity review started",
        event_summary:
          "Sample interview workflow created with candidate, recruiter, governance and signal context.",
        actor_type: "guided_demo_mode",
        metadata: demoMetadata,
        severity: "review",
        created_at: now,
      },
    ]);
  });

  await bestEffort("demo replay", async () => {
    await supabase.from("trust_replay_sessions").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      replay_summary:
        "Demo replay reconstructs sample candidate provenance, interview signals, governance review and receipt context.",
      generated_by: "guided_demo_mode",
      created_at: now,
    });
  });

  await bestEffort("demo trust receipt", async () => {
    await supabase.from("verification_receipts").insert({
      subject_type: "interview_session",
      subject_id: session.id,
      receipt_type: "demo_interview_integrity_reviewed",
      verification_status: "in_review",
      confidence_level: "Verified with Review",
      receipt_summary:
        "Sample verification receipt showing how Cyber Sentinels explains evidence, signals and human governance context.",
      evidence_snapshot: {
        ...demoMetadata,
        workspace_id: workspace.id,
        trust_case_id: trustCase.id,
        candidate_profile_id: candidate.id,
        recruiter_profile_id: recruiter.id,
        interview_session_id: session.id,
        human_review: true,
      },
      issued_at: now,
    });
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
  };
}
