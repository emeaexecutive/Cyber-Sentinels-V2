export function isPreviewTurnstileFallbackEnvironment(environment?: string, hostname?: string) {
  const normalizedEnvironment = String(environment ?? "").trim().toLowerCase();
  const normalizedHostname = String(hostname ?? "").trim().toLowerCase();

  if (normalizedEnvironment === "preview") {
    return true;
  }

  if (!normalizedHostname) {
    return false;
  }

  if (normalizedHostname === "localhost" || normalizedHostname === "127.0.0.1") {
    return true;
  }

  return normalizedHostname.endsWith(".vercel.app") || normalizedHostname.includes("vercel.app");
}
