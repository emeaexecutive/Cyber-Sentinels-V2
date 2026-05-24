import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export type ApiKeyStatus = "active" | "paused" | "revoked";

export type ApiKeySummary = {
  id: string;
  label: string;
  key_prefix: string;
  status: ApiKeyStatus;
  created_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_status: string;
};

type ApiKeyRow = Partial<ApiKeySummary> & {
  user_id?: string | null;
  user_email?: string | null;
};

export const apiKeyStatuses: ApiKeyStatus[] = ["active", "paused", "revoked"];

export const apiKeyAuditEvents = [
  "api_key_created",
  "api_key_viewed",
  "api_key_revoked",
] as const;

export const apiKeySignals = [
  "developer_console_opened",
  "api_key_created",
  "api_key_rotated",
  "api_usage_threshold_warning",
] as const;

export function maskApiKeyPrefix(prefix: string | null | undefined) {
  if (!prefix) return "cs_test_****";

  if (prefix.startsWith("cs_live_")) return "cs_live_****";
  if (prefix.startsWith("cs_test_")) return "cs_test_****";

  return `${prefix.slice(0, 7)}****`;
}

function normalizeStatus(status: string | null | undefined): ApiKeyStatus {
  if (status && apiKeyStatuses.includes(status as ApiKeyStatus)) {
    return status as ApiKeyStatus;
  }

  return "active";
}

function normalizeApiKey(row: ApiKeyRow): ApiKeySummary {
  return {
    id: String(row.id ?? "placeholder"),
    label: String(row.label ?? "Trust API key"),
    key_prefix: maskApiKeyPrefix(row.key_prefix),
    status: normalizeStatus(row.status),
    created_at: row.created_at ?? null,
    last_used_at: row.last_used_at ?? null,
    usage_count:
      typeof row.usage_count === "number" && Number.isFinite(row.usage_count)
        ? row.usage_count
        : 0,
    rate_limit_status: String(row.rate_limit_status ?? "normal"),
  };
}

export function createDemoApiKeys(): ApiKeySummary[] {
  return [
    {
      id: "demo-api-key-test",
      label: "Sandbox Trust API",
      key_prefix: "cs_test_****",
      status: "active",
      created_at: new Date().toISOString(),
      last_used_at: null,
      usage_count: 0,
      rate_limit_status: "normal",
    },
  ];
}

export async function getApiKeySummaries(
  supabase: SupabaseClient,
  user: User
) {
  const { data, error } = await supabase
    .from("api_keys")
    .select(
      "id,label,key_prefix,status,created_at,last_used_at,usage_count,rate_limit_status,user_id,user_email"
    )
    .or(`user_id.eq.${user.id},user_email.eq.${user.email ?? ""}`)
    .order("created_at", { ascending: false })
    .returns<ApiKeyRow[]>();

  if (error) {
    return { keys: createDemoApiKeys(), tableAvailable: false };
  }

  return {
    keys: data?.length ? data.map(normalizeApiKey) : [],
    tableAvailable: true,
  };
}

export async function createPlaceholderApiKey(
  supabase: SupabaseClient,
  user: User,
  input: { label: string; environment: "test" | "live" }
) {
  const cleanLabel = input.label.trim().slice(0, 80) || "Trust API key";
  const prefix = input.environment === "live" ? "cs_live_" : "cs_test_";

  // Production should generate a high-entropy secret, hash it with a slow
  // keyed hash, store only the hash + prefix, and reveal the full key exactly
  // once to the creator. V1 stores only a masked placeholder prefix.
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      label: cleanLabel,
      key_prefix: `${prefix}****`,
      status: "active",
      usage_count: 0,
      rate_limit_status: "normal",
      user_id: user.id,
      user_email: user.email,
    })
    .select(
      "id,label,key_prefix,status,created_at,last_used_at,usage_count,rate_limit_status"
    )
    .single()
    .returns<ApiKeyRow>();

  if (error || !data) {
    return {
      key: normalizeApiKey({
        id: "placeholder-api-key",
        label: cleanLabel,
        key_prefix: `${prefix}****`,
        status: "active",
        usage_count: 0,
        rate_limit_status: "normal",
        created_at: new Date().toISOString(),
      }),
      tableAvailable: false,
    };
  }

  return { key: normalizeApiKey(data), tableAvailable: true };
}

export async function recordApiKeyAudit(
  supabase: SupabaseClient,
  eventType: (typeof apiKeyAuditEvents)[number],
  actor: string,
  metadata: Record<string, unknown> = {}
) {
  await createAuditLog(supabase, eventType, actor, metadata);
}

export async function recordApiKeySignal(
  supabase: SupabaseClient,
  signal: (typeof apiKeySignals)[number]
) {
  await createSignal(supabase, signal);
}
