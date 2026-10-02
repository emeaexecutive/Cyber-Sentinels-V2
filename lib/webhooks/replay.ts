export type WebhookReplayState = {
  eventType: string;
  payloadHash: string;
  processingStatus: "received" | "processing" | "processed" | "failed" | "duplicate";
};

export function classifyWebhookReplay(existing: WebhookReplayState, incoming: Pick<WebhookReplayState, "eventType" | "payloadHash">) {
  if (existing.eventType !== incoming.eventType || existing.payloadHash !== incoming.payloadHash) return "payload_mismatch" as const;
  if (existing.processingStatus === "processed") return "duplicate" as const;
  if (existing.processingStatus === "failed") return "retry" as const;
  return "in_progress" as const;
}