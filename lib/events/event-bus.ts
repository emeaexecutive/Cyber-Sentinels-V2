export type TrustRuntimeEventName =
  | "signal.received"
  | "trust.updated"
  | "workflow.allowed"
  | "workflow.review"
  | "workflow.escalated"
  | "workflow.blocked"
  | "replay.created"
  | "governance.created"
  | "provider.timeout"
  | "provider.failed"
  | "stepup.required";

export type TrustRuntimeEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  name: TrustRuntimeEventName;
  payload: TPayload;
  created_at: string;
  replay_safe: boolean;
};

type TrustRuntimeEventHandler = (event: TrustRuntimeEvent) => void | Promise<void>;

const handlers = new Map<TrustRuntimeEventName, Set<TrustRuntimeEventHandler>>();
const recentEvents: TrustRuntimeEvent[] = [];

export function subscribeTrustEvent(name: TrustRuntimeEventName, handler: TrustRuntimeEventHandler) {
  const listeners = handlers.get(name) ?? new Set<TrustRuntimeEventHandler>();
  listeners.add(handler);
  handlers.set(name, listeners);
  return () => listeners.delete(handler);
}

export function publishTrustEvent<TPayload extends Record<string, unknown>>(
  name: TrustRuntimeEventName,
  payload: TPayload,
  options: { replaySafe?: boolean } = {}
) {
  const event: TrustRuntimeEvent<TPayload> = {
    id: crypto.randomUUID(),
    name,
    payload,
    created_at: new Date().toISOString(),
    replay_safe: options.replaySafe ?? true,
  };
  recentEvents.unshift(event);
  recentEvents.splice(100);
  queueMicrotask(() => {
    for (const handler of handlers.get(name) ?? []) {
      Promise.resolve(handler(event)).catch((error) => {
        console.warn("Trust event handler failed", { name, error });
      });
    }
  });
  return event;
}

export function getRecentTrustEvents(limit = 30) {
  return recentEvents.slice(0, limit);
}
