export type TrustCacheKey =
  | "trust_posture"
  | "provider_state"
  | "session_integrity"
  | "replay_summary"
  | "governance_status"
  | "agent_runtime_posture";

type TrustCacheEntry<TValue> = {
  value: TValue;
  expires_at: number;
  written_at: string;
  replay_safe: boolean;
};

const cache = new Map<string, TrustCacheEntry<unknown>>();

function cacheId(scope: TrustCacheKey, id: string) {
  return `${scope}:${id}`;
}

export function setTrustCache<TValue>(
  scope: TrustCacheKey,
  id: string,
  value: TValue,
  options: { ttlMs?: number; replaySafe?: boolean } = {}
) {
  const ttlMs = options.ttlMs ?? 30_000;
  cache.set(cacheId(scope, id), {
    value,
    expires_at: Date.now() + ttlMs,
    written_at: new Date().toISOString(),
    replay_safe: options.replaySafe ?? true,
  });
  return value;
}

export function getTrustCache<TValue>(scope: TrustCacheKey, id: string) {
  const entry = cache.get(cacheId(scope, id)) as TrustCacheEntry<TValue> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expires_at) return { ...entry, stale: true as const };
  return { ...entry, stale: false as const };
}

export function invalidateTrustCache(scope: TrustCacheKey, id?: string) {
  if (id) {
    cache.delete(cacheId(scope, id));
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${scope}:`)) cache.delete(key);
  }
}

export function updateReplaySafeTrustCache<TValue>(
  scope: TrustCacheKey,
  id: string,
  updater: (current: TValue | null) => TValue,
  options: { ttlMs?: number } = {}
) {
  const current = getTrustCache<TValue>(scope, id);
  const next = updater(current?.value ?? null);
  return setTrustCache(scope, id, next, { ttlMs: options.ttlMs, replaySafe: true });
}
