export type TrustClientOptions = {
  baseUrl?: string;
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
};

export class OperationalTrustClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly request: typeof globalThis.fetch;

  constructor(options: TrustClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "").replace(/\/$/, "");
    this.accessToken = options.accessToken;
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.request(`${this.baseUrl}${path}`, {
      credentials: "include",
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined,
    });
    if (!response.ok) throw new Error(`Operational Trust API request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }

  getPosture(workflowId: string) {
    return this.get(`/api/trust/posture?workflow_id=${encodeURIComponent(workflowId)}`);
  }

  getWorkflowTrust(workflowId: string) {
    return this.get(`/api/workflows/${encodeURIComponent(workflowId)}/trust`);
  }

  getReplay(replayId: string) {
    return this.get(`/api/replay/${encodeURIComponent(replayId)}`);
  }

  getReceipt(receiptId: string) {
    return this.get(`/api/receipts/${encodeURIComponent(receiptId)}`);
  }

  getGovernanceEvents(workflowId: string) {
    return this.get(`/api/governance/events?workflow_id=${encodeURIComponent(workflowId)}`);
  }
}

