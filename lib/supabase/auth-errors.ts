export function isMissingAuthSessionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    name?: unknown;
    status?: unknown;
  };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    code === "session_not_found" ||
    name === "AuthSessionMissingError" ||
    message.includes("auth session missing")
  );
}
