export const atsEventTypes = [
  "candidate.created",
  "candidate.updated",
  "interview.scheduled",
  "interview.completed",
  "offer.created",
  "verification.requested",
] as const;

export type ATSEventType = (typeof atsEventTypes)[number];

export const atsProviderStatuses = [
  "Connected",
  "Placeholder",
  "Awaiting API credentials",
  "Webhook configured",
  "Disabled",
] as const;

export type ATSProviderStatus = (typeof atsProviderStatuses)[number];

export type ATSProviderId =
  | "greenhouse"
  | "lever"
  | "workday"
  | "ashby"
  | "smartrecruiters"
  | "atlast";

export type ATSProviderCapability =
  | "candidate_events"
  | "interview_events"
  | "offer_events"
  | "verification_trigger"
  | "receipt_export"
  | "replay_link";

export type ATSProviderDefinition = {
  id: ATSProviderId;
  name: string;
  status: ATSProviderStatus;
  capabilities: ATSProviderCapability[];
  credentialEnv: string;
  endpointEnv: string;
  webhookSecretEnv: string;
  credentialsPresent: boolean;
  endpointConfigured: boolean;
  webhookConfigured: boolean;
  apiAccessVerified: boolean;
  notes: string;
};

export type ATSCandidateReference = {
  externalId: string;
  name: string;
  email: string;
  jobId?: string | null;
  jobTitle?: string | null;
};

export type ATSInterviewReference = {
  externalId: string;
  candidateExternalId: string;
  scheduledAt?: string | null;
  title?: string | null;
};

export type ATSWebhookEvent = {
  provider: ATSProviderId;
  eventType: ATSEventType;
  eventId: string;
  occurredAt: string;
  candidate?: ATSCandidateReference;
  interview?: ATSInterviewReference;
  metadata: Record<string, unknown>;
};

export type ATSPreparedAction = {
  action:
    | "create_verification_workflow"
    | "calculate_trust_posture"
    | "attach_replay_link"
    | "generate_verification_receipt"
    | "escalate_governance_review";
  state: "completed" | "prepared" | "not_applicable";
  detail: string;
};

export type ATSTrustReceiptExport = {
  workflowReference: string;
  candidateReference: string | null;
  verificationState: string;
  trustPosture: string;
  receiptReference: string;
  receiptUrl: string;
  replayReference: string | null;
  replayUrl: string | null;
  governanceState: string;
  evidenceSummary: string;
  generatedAt: string;
};

export type ATSExportResult =
  | {
      delivered: true;
      provider: ATSProviderId;
      statusCode: number;
      deliveredAt: string;
    }
  | {
      delivered: false;
      provider: ATSProviderId;
      reason:
        | "provider_not_connected"
        | "missing_export_endpoint"
        | "missing_api_credentials"
        | "delivery_failed";
      statusCode?: number;
    };

export interface ATSProvider {
  definition: ATSProviderDefinition;
  normalizeWebhook(payload: unknown, eventType: ATSEventType): ATSWebhookEvent;
  exportTrustReceipt(receipt: ATSTrustReceiptExport): Promise<ATSExportResult>;
}
