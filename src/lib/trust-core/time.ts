export function normalizeUtcTimestamp(value: string, field = "timestamp"): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) throw new TypeError(`${field} must be an ISO 8601 timestamp.`);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${field} must be a valid timestamp.`);
  return new Date(milliseconds).toISOString();
}

export function isExpired(expiresAt: string | undefined, asOf = new Date().toISOString()): boolean {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(asOf));
}

export function compareTrustTime(left: string, right: string): number {
  return Date.parse(normalizeUtcTimestamp(left)) - Date.parse(normalizeUtcTimestamp(right));
}
