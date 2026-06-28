import "server-only";

import {
  atsEventTypes,
  type ATSCandidateReference,
  type ATSEventType,
  type ATSExportResult,
  type ATSInterviewReference,
  type ATSProvider,
  type ATSProviderDefinition,
  type ATSTrustReceiptExport,
  type ATSWebhookEvent,
} from "@/lib/integrations/ats/types";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nested(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function candidateReference(payload: Record<string, unknown>) {
  const candidate = record(payload.candidate ?? payload.data);
  const externalId = text(
    nested(candidate, "externalId", "external_id", "id") ??
      nested(payload, "candidateId", "candidate_id")
  );
  const email = text(nested(candidate, "email", "email_address"));
  const name = text(
    nested(candidate, "name", "full_name") ??
      [text(candidate.first_name), text(candidate.last_name)].filter(Boolean).join(" ")
  );
  if (!externalId && !email && !name) return undefined;

  return {
    externalId,
    email,
    name,
    jobId:
      text(nested(candidate, "jobId", "job_id") ?? nested(payload, "jobId", "job_id")) ||
      null,
    jobTitle:
      text(
        nested(candidate, "jobTitle", "job_title") ??
          nested(payload, "jobTitle", "job_title")
      ) || null,
  } satisfies ATSCandidateReference;
}

function interviewReference(payload: Record<string, unknown>) {
  const interview = record(payload.interview ?? payload.data);
  const externalId = text(
    nested(interview, "externalId", "external_id", "id") ??
      nested(payload, "interviewId", "interview_id")
  );
  const candidateExternalId = text(
    nested(interview, "candidateExternalId", "candidate_external_id", "candidateId", "candidate_id") ??
      nested(payload, "candidateId", "candidate_id")
  );
  if (!externalId && !candidateExternalId) return undefined;

  return {
    externalId,
    candidateExternalId,
    scheduledAt:
      text(
        nested(interview, "scheduledAt", "scheduled_at", "start_time") ??
          nested(payload, "scheduledAt", "scheduled_at")
      ) || null,
    title: text(nested(interview, "title", "name")) || null,
  } satisfies ATSInterviewReference;
}

export class GenericATSProvider implements ATSProvider {
  constructor(public readonly definition: ATSProviderDefinition) {}

  normalizeWebhook(payload: unknown, eventType: ATSEventType): ATSWebhookEvent {
    if (!atsEventTypes.includes(eventType)) {
      throw new Error("Unsupported ATS event type.");
    }

    const body = record(payload);
    const eventId = text(
      nested(body, "eventId", "event_id", "id"),
      `${this.definition.id}:${eventType}:${Date.now()}`
    );
    const occurredAt = text(
      nested(body, "occurredAt", "occurred_at", "created_at", "timestamp"),
      new Date().toISOString()
    );

    return {
      provider: this.definition.id,
      eventType,
      eventId,
      occurredAt,
      candidate: candidateReference(body),
      interview: interviewReference(body),
      metadata: {
        source: "ats_webhook",
        provider: this.definition.id,
        event_type: eventType,
      },
    };
  }

  async exportTrustReceipt(
    receipt: ATSTrustReceiptExport
  ): Promise<ATSExportResult> {
    const endpoint = text(process.env[this.definition.endpointEnv]);
    const credential = text(process.env[this.definition.credentialEnv]);

    if (this.definition.status !== "Connected") {
      return {
        delivered: false,
        provider: this.definition.id,
        reason: "provider_not_connected",
      };
    }
    if (!endpoint) {
      return {
        delivered: false,
        provider: this.definition.id,
        reason: "missing_export_endpoint",
      };
    }
    if (!credential) {
      return {
        delivered: false,
        provider: this.definition.id,
        reason: "missing_api_credentials",
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${credential}`,
          "content-type": "application/json",
          "user-agent": "Cyber-Sentinels-ATS/1.0",
        },
        body: JSON.stringify(receipt),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return {
          delivered: false,
          provider: this.definition.id,
          reason: "delivery_failed",
          statusCode: response.status,
        };
      }

      return {
        delivered: true,
        provider: this.definition.id,
        statusCode: response.status,
        deliveredAt: new Date().toISOString(),
      };
    } catch {
      return {
        delivered: false,
        provider: this.definition.id,
        reason: "delivery_failed",
      };
    }
  }
}
