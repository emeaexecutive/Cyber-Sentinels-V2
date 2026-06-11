import "server-only";

type OperationalSeverity = "info" | "warning" | "error";

type OperationalMetadata = Record<string, string | number | boolean | null | undefined>;

function sanitizeValue(value: OperationalMetadata[string]) {
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 157)}...` : value;
  }

  return value ?? null;
}

export function captureOperationalIssue(
  scope: string,
  severity: OperationalSeverity,
  message: string,
  metadata: OperationalMetadata = {}
) {
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, sanitizeValue(value)])
  );
  const entry = {
    scope,
    severity,
    message,
    metadata: safeMetadata,
    recorded_at: new Date().toISOString(),
  };

  if (severity === "error") {
    console.error("[operational-monitoring]", entry);
    return;
  }

  if (severity === "warning") {
    console.warn("[operational-monitoring]", entry);
    return;
  }

  console.info("[operational-monitoring]", entry);
}
