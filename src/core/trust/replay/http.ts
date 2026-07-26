import "server-only";

import { TrustArchitectureApiError } from "@/src/lib/trust-architecture/http";
import { replayEventTypes, type ReplayEventType } from "./ReplayEvent.ts";
import type { ReplaySearch } from "./ReplayRepository.ts";

const safeReference = /^[A-Za-z0-9][A-Za-z0-9_.:@-]{0,159}$/;

function date(value: string | null, field: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TrustArchitectureApiError(`${field} must be an ISO date.`, 400, "REPLAY_DATE_INVALID");
  }
  return parsed.toISOString();
}

function score(value: string | null, field: string): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new TrustArchitectureApiError(
      `${field} must be between 0 and 100.`,
      400,
      "REPLAY_SCORE_INVALID",
    );
  }
  return parsed;
}

function reference(value: string | null, field: string): string | undefined {
  if (!value) return undefined;
  if (!safeReference.test(value)) {
    throw new TrustArchitectureApiError(`${field} is invalid.`, 400, "REPLAY_FILTER_INVALID");
  }
  return value;
}

export function replaySearch(request: Request, limit = 500): ReplaySearch {
  const params = new URL(request.url).searchParams;
  const requestedLimit = params.get("limit") === null ? limit : Number(params.get("limit"));
  if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) {
    throw new TrustArchitectureApiError(
      "limit must be between 1 and 500.",
      400,
      "REPLAY_LIMIT_INVALID",
    );
  }
  const eventTypes = params.get("eventType")
    ?.split(",")
    .filter(Boolean)
    .map((value) => value.toUpperCase() as ReplayEventType);
  if (eventTypes?.some((value) => !replayEventTypes.includes(value))) {
    throw new TrustArchitectureApiError(
      "eventType contains an unsupported event.",
      400,
      "REPLAY_EVENT_TYPE_INVALID",
    );
  }
  const from = date(params.get("from"), "from");
  const to = date(params.get("to"), "to");
  if (from && to && from > to) {
    throw new TrustArchitectureApiError(
      "from must be before to.",
      400,
      "REPLAY_DATE_RANGE_INVALID",
    );
  }
  const riskMin = score(params.get("riskMin"), "riskMin");
  const riskMax = score(params.get("riskMax"), "riskMax");
  const trustMin = score(params.get("trustMin"), "trustMin");
  const trustMax = score(params.get("trustMax"), "trustMax");
  if (
    (riskMin !== undefined && riskMax !== undefined && riskMin > riskMax) ||
    (trustMin !== undefined && trustMax !== undefined && trustMin > trustMax)
  ) {
    throw new TrustArchitectureApiError(
      "Replay score minimums must not exceed their maximums.",
      400,
      "REPLAY_SCORE_RANGE_INVALID",
    );
  }
  return {
    from,
    to,
    riskMin,
    riskMax,
    trustMin,
    trustMax,
    provider: reference(params.get("provider"), "provider"),
    actor: reference(params.get("actor"), "actor"),
    evidenceType: reference(params.get("evidenceType"), "evidenceType"),
    eventTypes,
    limit: requestedLimit,
  };
}

export function replayFormat(request: Request): "json" | "csv" | "audit" {
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (!["json", "csv", "audit"].includes(format)) {
    throw new TrustArchitectureApiError(
      "format must be json, csv or audit.",
      400,
      "REPLAY_FORMAT_INVALID",
    );
  }
  return format as "json" | "csv" | "audit";
}

export function replayCsvResponse(csv: string, entityId: string, correlationId: string) {
  return new Response(csv, {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="replay-${entityId}.csv"`,
      "content-type": "text/csv; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-correlation-id": correlationId,
    },
  });
}
