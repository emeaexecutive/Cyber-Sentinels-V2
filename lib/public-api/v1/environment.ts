export type PublicApiEnvironment = "local" | "test" | "staging" | "production";

export function publicApiEnvironmentMetadata(env: NodeJS.ProcessEnv = process.env) {
  const name = String(env.CYBER_SENTINELS_ENVIRONMENT ?? "").trim().toLowerCase();
  const originValue = String(env.CYBER_SENTINELS_PUBLIC_ORIGIN ?? "").trim();
  if (!["local", "test", "staging", "production"].includes(name)) {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "CYBER_SENTINELS_ENVIRONMENT_INVALID", name: name || null, origin: null };
  }
  let origin: URL;
  try { origin = new URL(originValue); } catch {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "CYBER_SENTINELS_PUBLIC_ORIGIN_INVALID", name, origin: null };
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(origin.hostname);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || (origin.protocol !== "https:" && !(name === "local" && local))) {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "CYBER_SENTINELS_PUBLIC_ORIGIN_INVALID", name, origin: null };
  }
  if (name === "production" && origin.origin !== "https://www.cybersentinels.com") {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "PRODUCTION_ORIGIN_MISMATCH", name, origin: origin.origin };
  }
  if (name !== "production" && /(^|\.)cybersentinels\.com$/i.test(origin.hostname) && origin.hostname === "www.cybersentinels.com") {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "NON_PRODUCTION_ORIGIN_POINTS_TO_PRODUCTION", name, origin: origin.origin };
  }
  if (["test", "staging"].includes(name) && /\.vercel\.app$/i.test(origin.hostname)) {
    return { valid: false as const, state: "CONFIGURATION_INVALID" as const, reasonCode: "PREVIEW_ORIGIN_IS_NOT_STABLE_CUSTOMER_CONTRACT", name, origin: origin.origin };
  }
  return { valid: true as const, state: "CONFIGURED" as const, reasonCode: "PUBLIC_API_ENVIRONMENT_CONFIGURED", name: name as PublicApiEnvironment, origin: origin.origin };
}
