import { consentDefaults, normalizeConsentChoices } from "./policy.ts";
import type { ConsentAction, ConsentChoices } from "./types.ts";

export const localConsentStorageKey = "cs_consent_local_v1";
export const localConsentCookieName = "cs_consent_local";
export const consentSavedToastSessionPrefix = "cookie_preferences_saved:";
export const consentSyncMaximumAttempts = 5;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const retryDelaysMs = [0, 5_000, 30_000, 2 * 60_000, 10 * 60_000] as const;

export type ConsentDecisionState = "undecided" | "accepted" | "rejected" | "customized";
export type ConsentReceiptSyncStatus = "idle" | "syncing" | "retry_scheduled" | "synced" | "failed_terminal";

export type LocalConsentReceipt = {
  schemaVersion: "cookie-consent-local-v1";
  receiptId: string;
  anonymousId: string;
  idempotencyKey: string;
  consentVersion: string;
  action: ConsentAction;
  choices: ConsentChoices;
  source: "cookie_banner" | "cookie_preferences";
  status: ConsentReceiptSyncStatus;
  createdAt: string;
  expiresAt: string;
  retryCount: number;
  lastAttemptAt: string | null;
  serverReceiptId: string | null;
};

export type ConsentLocalRead = {
  state: "missing" | "stale" | "valid";
  receipt: LocalConsentReceipt | null;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function choicesForConsentAction(action: ConsentAction, current: ConsentChoices) {
  if (action === "ACCEPT_ALL") {
    return { essential: true, functional: true, analytics: true, ai_improvements: true, marketing: true } satisfies ConsentChoices;
  }
  if (action === "REJECT_OPTIONAL" || action === "WITHDRAW") return consentDefaults("GLOBAL_DEFAULT");
  return normalizeConsentChoices(current, "GLOBAL_DEFAULT");
}

export function createLocalConsentReceipt(input: {
  action: ConsentAction;
  choices: ConsentChoices;
  consentVersion: string;
  source: LocalConsentReceipt["source"];
  anonymousId?: string;
  now?: Date;
  randomUuid?: () => string;
  expiresAfterDays?: number;
}): LocalConsentReceipt {
  const now = input.now ?? new Date();
  const randomUuid = input.randomUuid ?? (() => crypto.randomUUID());
  return {
    schemaVersion: "cookie-consent-local-v1",
    receiptId: randomUuid(),
    anonymousId: input.anonymousId && uuidPattern.test(input.anonymousId) ? input.anonymousId : randomUuid(),
    idempotencyKey: randomUuid(),
    consentVersion: input.consentVersion,
    action: input.action,
    choices: choicesForConsentAction(input.action, input.choices),
    source: input.source,
    status: "idle",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (input.expiresAfterDays ?? 180) * 86_400_000).toISOString(),
    retryCount: 0,
    lastAttemptAt: null,
    serverReceiptId: null,
  };
}

function isReceipt(value: unknown): value is LocalConsentReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const receipt = value as Partial<LocalConsentReceipt>;
  return receipt.schemaVersion === "cookie-consent-local-v1"
    && Boolean(receipt.consentVersion)
    && uuidPattern.test(receipt.receiptId ?? "")
    && uuidPattern.test(receipt.anonymousId ?? "")
    && uuidPattern.test(receipt.idempotencyKey ?? "")
    && ["idle", "local_saved", "syncing", "synced", "retry_scheduled", "failed_terminal", "pending_sync", "persisted"].includes(receipt.status ?? "")
    && Number.isInteger(receipt.retryCount)
    && Boolean(receipt.createdAt)
    && Boolean(receipt.expiresAt)
    && Boolean(receipt.choices)
    && typeof receipt.choices === "object"
    && ["essential", "functional", "analytics", "ai_improvements", "marketing"].every((key) => typeof (receipt.choices as Record<string, unknown>)[key] === "boolean")
    && (receipt.choices as ConsentChoices).essential === true;
}

export function parseLocalConsentReceipt(value: string | null, consentVersion: string, now = new Date()): ConsentLocalRead {
  if (!value) return { state: "missing", receipt: null };
  try {
    const receipt = JSON.parse(value) as unknown;
    if (!isReceipt(receipt)) return { state: "missing", receipt: null };
    const legacyStatus = (receipt as unknown as { status: string }).status;
    const migratedStatus: ConsentReceiptSyncStatus = legacyStatus === "persisted"
      ? "synced"
      : legacyStatus === "pending_sync"
        ? (receipt.retryCount > 0 ? "retry_scheduled" : "idle")
        : legacyStatus === "local_saved"
          ? "idle"
        : legacyStatus === "syncing"
          ? "retry_scheduled"
          : legacyStatus as ConsentReceiptSyncStatus;
    const status = migratedStatus !== "synced" && receipt.retryCount >= consentSyncMaximumAttempts
      ? "failed_terminal"
      : migratedStatus;
    const normalized = { ...receipt, status, choices: normalizeConsentChoices(receipt.choices, "GLOBAL_DEFAULT") };
    if (normalized.consentVersion !== consentVersion || Date.parse(normalized.expiresAt) <= now.getTime()) {
      return { state: "stale", receipt: normalized };
    }
    return { state: "valid", receipt: normalized };
  } catch {
    return { state: "missing", receipt: null };
  }
}

export function readLocalConsentReceipt(storage: StorageLike, consentVersion: string, now = new Date()) {
  return parseLocalConsentReceipt(storage.getItem(localConsentStorageKey), consentVersion, now);
}

export function writeLocalConsentReceipt(storage: StorageLike, receipt: LocalConsentReceipt) {
  storage.setItem(localConsentStorageKey, JSON.stringify(receipt));
}

export function removeLocalConsentReceipt(storage: StorageLike) {
  storage.removeItem(localConsentStorageKey);
}

export function markConsentSyncAttempt(receipt: LocalConsentReceipt, now = new Date()): LocalConsentReceipt {
  return { ...receipt, status: "syncing", retryCount: receipt.retryCount + 1, lastAttemptAt: now.toISOString() };
}

export function markConsentSyncFailure(receipt: LocalConsentReceipt): LocalConsentReceipt {
  return {
    ...receipt,
    status: receipt.retryCount >= consentSyncMaximumAttempts ? "failed_terminal" : "retry_scheduled",
  };
}

export function markConsentPersisted(receipt: LocalConsentReceipt, serverReceiptId: string): LocalConsentReceipt {
  return { ...receipt, status: "synced", serverReceiptId };
}

export function consentRetryDelayRemainingMs(receipt: LocalConsentReceipt, now = new Date()) {
  if (receipt.status === "synced" || receipt.status === "failed_terminal") return null;
  if (receipt.status === "idle" || !receipt.lastAttemptAt) return 0;
  const retryDelay = retryDelaysMs[Math.min(receipt.retryCount, retryDelaysMs.length - 1)];
  return Math.max(0, Date.parse(receipt.lastAttemptAt) + retryDelay - now.getTime());
}

export function consentRetryIsDue(receipt: LocalConsentReceipt, now = new Date()) {
  return consentRetryDelayRemainingMs(receipt, now) === 0;
}

export function effectiveConsentChoices(receipt: LocalConsentReceipt | null) {
  return receipt?.status === "synced" ? receipt.choices : consentDefaults("GLOBAL_DEFAULT");
}

export function consentDecisionState(receipt: LocalConsentReceipt | null): ConsentDecisionState {
  if (!receipt) return "undecided";
  if (receipt.action === "ACCEPT_ALL") return "accepted";
  if (receipt.action === "REJECT_OPTIONAL" || receipt.action === "WITHDRAW") return "rejected";
  return "customized";
}

export function localConsentCookieValue(receipt: LocalConsentReceipt) {
  return encodeURIComponent(JSON.stringify({
    version: receipt.consentVersion,
    choices: receipt.choices,
    status: receipt.status,
    expiresAt: receipt.expiresAt,
  }));
}
