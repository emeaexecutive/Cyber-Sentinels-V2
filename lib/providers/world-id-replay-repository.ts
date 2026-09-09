import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

export type WorldIdReplayClaimInput = {
  enterpriseId: string;
  action: string;
  subjectReference: string;
  nullifierHash: string;
  providerReference: string;
  verificationReference: string;
  payloadHash?: string;
};

export type WorldIdReplayClaimResult = {
  accepted: boolean;
  claimId?: string | null;
  reasonCode?: string;
};

export interface WorldIdReplayStore {
  claim(input: WorldIdReplayClaimInput): Promise<WorldIdReplayClaimResult>;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isProductionLikeEnvironment() {
  return ["production", "prod"].includes(String(process.env.NODE_ENV ?? "").toLowerCase())
    || ["production", "prod"].includes(String(process.env.NEXT_PUBLIC_VERCEL_ENV ?? "").toLowerCase())
    || ["production", "prod"].includes(String(process.env.VERCEL_ENV ?? "").toLowerCase());
}

function getReplayStorePath() {
  const configuredPath = text(process.env.WORLD_ID_REPLAY_STORE_PATH).trim();
  return configuredPath || join(tmpdir(), "cyber-sentinels-world-id-replay.json");
}

function canonicalizeWorldIdNullifier(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function digestWorldIdNullifier(value: string) {
  return createHash("sha256").update(canonicalizeWorldIdNullifier(value)).digest("hex");
}

function canonicalKey(input: WorldIdReplayClaimInput) {
  return `${input.action}:${digestWorldIdNullifier(input.nullifierHash)}`;
}

class FileSystemWorldIdReplayStore implements WorldIdReplayStore {
  private readonly store = new Map<string, string>();

  constructor() {
    this.load();
  }

  async claim(input: WorldIdReplayClaimInput) {
    const key = canonicalKey(input);
    if (this.store.has(key)) {
      return { accepted: false, reasonCode: "WORLD_ID_DUPLICATE_NULLIFIER" };
    }
    // The durable fallback stores only the one-way digest used by the replay
    // key. The provider nullifier itself is never written to disk.
    this.store.set(key, digestWorldIdNullifier(input.nullifierHash));
    this.persist();
    return { accepted: true, claimId: key };
  }

  clear() {
    this.store.clear();
    try {
      rmSync(getReplayStorePath(), { force: true });
    } catch {
      // Ignore cleanup failures.
    }
  }

  private load() {
    try {
      const content = readFileSync(getReplayStorePath(), "utf8");
      if (!content.trim()) return;
      const parsed = JSON.parse(content) as Record<string, string>;
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string") this.store.set(key, value);
      }
    } catch (error) {
      const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== "ENOENT") {
        console.warn("Unable to load World ID replay store from disk.", error);
      }
    }
  }

  private persist() {
    const storePath = getReplayStorePath();
    mkdirSync(dirname(storePath), { recursive: true });
    writeFileSync(storePath, JSON.stringify(Object.fromEntries(this.store.entries())), "utf8");
  }
}

class SupabaseWorldIdReplayStore implements WorldIdReplayStore {
  private readonly client: SupabaseClient<any, "public", any>;

  constructor(client: SupabaseClient<any, "public", any>) {
    this.client = client;
  }

  async claim(input: WorldIdReplayClaimInput) {
    const { data, error } = await this.client.rpc("claim_world_id_nullifier_v1", {
      p_enterprise_id: input.enterpriseId,
      p_provider: "world_id",
      p_nullifier_digest: digestWorldIdNullifier(input.nullifierHash),
      p_action: input.action,
      p_subject_reference: input.subjectReference,
      p_provider_reference: input.providerReference,
      p_verification_reference: input.verificationReference,
      p_payload_digest: input.payloadHash ?? null,
      p_verified_at: new Date().toISOString(),
    });

    if (error) {
      const message = String(error.message ?? "").toLowerCase();
      if (message.includes("duplicate") || message.includes("unique") || message.includes("already exists") || message.includes("23505")) {
        return { accepted: false, reasonCode: "WORLD_ID_NULLIFIER_REPLAY" };
      }
      return { accepted: false, reasonCode: "WORLD_ID_REPLAY_STORE_ERROR" };
    }

    const payload = data as { accepted?: boolean; claim_id?: string | null; reason_code?: string | null } | null;
    if (payload && payload.accepted === false) {
      return { accepted: false, reasonCode: payload.reason_code ?? "WORLD_ID_NULLIFIER_REPLAY" };
    }

    if (payload?.accepted !== true || typeof payload.claim_id !== "string" || !payload.claim_id.trim()) {
      return { accepted: false, reasonCode: "WORLD_ID_REPLAY_STORE_ERROR" };
    }

    return { accepted: true, claimId: payload.claim_id };
  }
}

class FailingWorldIdReplayStore implements WorldIdReplayStore {
  async claim() {
    return { accepted: false, reasonCode: "WORLD_ID_REPLAY_STORE_UNAVAILABLE" };
  }
}

export function createWorldIdReplayStore() {
  const serviceUrl = text(process.env.NEXT_PUBLIC_SUPABASE_URL).trim();
  const serviceKey = text(process.env.SUPABASE_SERVICE_ROLE_KEY).trim();

  if (serviceUrl && serviceKey) {
    try {
      const client = createClient(serviceUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      return new SupabaseWorldIdReplayStore(client);
    } catch {
      if (isProductionLikeEnvironment()) {
        return new FailingWorldIdReplayStore();
      }
    }
  }

  if (isProductionLikeEnvironment()) {
    return new FailingWorldIdReplayStore();
  }

  return new FileSystemWorldIdReplayStore();
}

export function createWorldIdReplayStoreKey(input: { tenantId?: string; subjectId?: string; action: string; nullifierHash: string }) {
  return `${input.action}:${digestWorldIdNullifier(input.nullifierHash)}`;
}

export function resetWorldIdReplayStoreForTests() {
  const store = createWorldIdReplayStore();
  if (store instanceof FileSystemWorldIdReplayStore) {
    store.clear();
  }
}
