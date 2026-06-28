export type OperationalTrustEventType =
  | "workflow.trust.updated"
  | "governance.action.recorded"
  | "receipt.issued"
  | "replay.available";

export type OperationalTrustEvent<T = Record<string, unknown>> = {
  schemaVersion: 1;
  id: string;
  type: OperationalTrustEventType;
  occurredAt: string;
  workflowReference: string;
  replayReference?: string;
  data: T;
};

export type WorkflowCallback = (event: OperationalTrustEvent) => Promise<void>;

