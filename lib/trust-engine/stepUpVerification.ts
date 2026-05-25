export const stepUpTriggerReasons = [
  "permission_step_up_required",
  "weak_human_presence",
  "weak_origin_trace",
  "high_risk_action",
  "admin_approval_required",
  "evidence_required",
  "suspicious_activity",
  "agent_permission_escalated",
] as const;

export const stepUpMethods = [
  "email_link",
  "admin_access_code",
  "liveness_check",
  "video_prompt",
  "voice_prompt",
  "document_upload",
  "linkedin_recheck",
  "manual_review",
  "hardware_key_future",
  "passkey_future",
] as const;

export const stepUpStatuses = [
  "not_required",
  "required",
  "pending",
  "submitted",
  "verified",
  "failed",
  "expired",
  "manual_review",
] as const;

export const stepUpSignals = [
  "step_up_required",
  "step_up_submitted",
  "step_up_verified",
  "step_up_failed",
  "step_up_expired",
  "step_up_manual_review",
] as const;

export const stepUpAuditEvents = [
  "step_up_requested",
  "step_up_completed",
  "step_up_failed",
  "step_up_escalated",
] as const;

export type StepUpTriggerReason = (typeof stepUpTriggerReasons)[number];
export type StepUpMethod = (typeof stepUpMethods)[number];
export type StepUpStatus = (typeof stepUpStatuses)[number];
export type StepUpSubjectType =
  | "human"
  | "candidate"
  | "admin"
  | "api_key"
  | "agent"
  | "system";

export type StepUpRequestInput = {
  subject_type: StepUpSubjectType;
  subject_id: string;
  trigger_reason: StepUpTriggerReason;
  method?: StepUpMethod | null;
};

export type StepUpResult = {
  step_up_status: StepUpStatus;
  required_methods: StepUpMethod[];
  expires_at: string;
  recommended_next_step: string;
};

export type DemoStepUpRequest = {
  action: string;
  subject: string;
  trigger_reason: StepUpTriggerReason;
  method: StepUpMethod;
  status: StepUpStatus;
  evidence: string;
};

export const demoStepUpRequests: DemoStepUpRequest[] = [
  {
    action: "Admin access to Back Office",
    subject: "Admin operator",
    trigger_reason: "admin_approval_required",
    method: "admin_access_code",
    status: "verified",
    evidence: "Protected admin challenge completed",
  },
  {
    action: "AI Agent autonomous action",
    subject: "Orion Research Agent",
    trigger_reason: "agent_permission_escalated",
    method: "manual_review",
    status: "pending",
    evidence: "Operator review required before autonomy",
  },
  {
    action: "Candidate Trust Report mismatch",
    subject: "Candidate profile",
    trigger_reason: "weak_human_presence",
    method: "video_prompt",
    status: "required",
    evidence: "Fresh video prompt requested",
  },
  {
    action: "API key high-volume usage",
    subject: "API Key cs_live_****",
    trigger_reason: "high_risk_action",
    method: "passkey_future",
    status: "pending",
    evidence: "Future passkey challenge placeholder",
  },
  {
    action: "Origin Trace weak",
    subject: "Reality Passport evidence",
    trigger_reason: "weak_origin_trace",
    method: "document_upload",
    status: "submitted",
    evidence: "Supporting source document submitted",
  },
];

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000).toISOString();
}

export function getRequiredStepUpMethods(
  triggerReason: StepUpTriggerReason,
  requestedMethod?: StepUpMethod | null
): StepUpMethod[] {
  const methods: StepUpMethod[] = [];

  if (requestedMethod) methods.push(requestedMethod);

  if (triggerReason === "weak_human_presence") {
    methods.push("liveness_check", "video_prompt");
  }

  if (triggerReason === "weak_origin_trace" || triggerReason === "evidence_required") {
    methods.push("document_upload");
  }

  if (triggerReason === "admin_approval_required") {
    methods.push("admin_access_code");
  }

  if (
    triggerReason === "agent_permission_escalated" ||
    triggerReason === "permission_step_up_required"
  ) {
    methods.push("manual_review");
  }

  if (triggerReason === "suspicious_activity") {
    methods.push("liveness_check", "manual_review");
  }

  if (triggerReason === "high_risk_action") {
    methods.push("passkey_future");
  }

  return unique(methods.length ? methods : ["email_link"]);
}

export function evaluateStepUpVerification(
  input: StepUpRequestInput,
  now = new Date()
): StepUpResult {
  const requiredMethods = getRequiredStepUpMethods(
    input.trigger_reason,
    input.method
  );
  const requiresManualReview = requiredMethods.includes("manual_review");
  const status: StepUpStatus = requiresManualReview ? "manual_review" : "pending";
  const recommendedNextStep = requiresManualReview
    ? "Route the request to a human reviewer before permission is granted"
    : "Collect the required step-up evidence before rechecking permission";

  return {
    step_up_status: status,
    required_methods: requiredMethods,
    expires_at: addMinutes(now, 30),
    recommended_next_step: recommendedNextStep,
  };
}
