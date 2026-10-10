// Keep credential material and upstream responses out of readiness output.
const projects = { staging: "agpyhygpfmppjkxwcpac", production: "kecgtsfibkypjuaxqbjx" } as const;
type Status = "PRESENT" | "MISSING" | "INVALID" | "WRONG ENVIRONMENT";

function credentialStatus(value: string | undefined, role: "anon" | "service_role", project: string): Status {
  if (!value?.trim()) return "MISSING";
  const key = value.trim();
  if (key.startsWith(role === "anon" ? "sb_publishable_" : "sb_secret_")) return "PRESENT";
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return "INVALID";
    // This is only a preflight claim check, never signature verification.
    // The runtime probes below require acceptance by the expected project.
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (claims.ref !== project) return "WRONG ENVIRONMENT";
    return claims.role === role ? "PRESENT" : "INVALID";
  } catch { return "INVALID"; }
}

export function configuredProjectBinding(env: NodeJS.ProcessEnv = process.env) {
  const environment = env.CYBER_SENTINELS_ENVIRONMENT?.trim().toLowerCase();
  const expectedProject = environment === "staging" || environment === "production" ? projects[environment] : null;
  const statuses: Record<string, Status> = {};
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const) {
    const value = env[name]?.trim();
    // SUPABASE_URL is an optional alias; if set, it must agree.
    if (!value) { statuses[name] = "MISSING"; continue; }
    try {
      const url = new URL(value);
      statuses[name] = !expectedProject || url.origin !== `https://${expectedProject}.supabase.co`
        ? "WRONG ENVIRONMENT"
        : url.username || url.password || url.pathname !== "/" || url.search || url.hash ? "INVALID" : "PRESENT";
    } catch { statuses[name] = "INVALID"; }
  }
  statuses.NEXT_PUBLIC_SUPABASE_ANON_KEY = credentialStatus(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "anon", expectedProject ?? "");
  statuses.SUPABASE_SERVICE_ROLE_KEY = credentialStatus(env.SUPABASE_SERVICE_ROLE_KEY, "service_role", expectedProject ?? "");
  const valid = Boolean(expectedProject) && statuses.NEXT_PUBLIC_SUPABASE_URL === "PRESENT"
    && (!env.SUPABASE_URL?.trim() || statuses.SUPABASE_URL === "PRESENT")
    && statuses.NEXT_PUBLIC_SUPABASE_ANON_KEY === "PRESENT" && statuses.SUPABASE_SERVICE_ROLE_KEY === "PRESENT";
  return { valid, expectedProject, projectIdentity: valid ? "CONFIGURED" : "INVALID", statuses };
}

export async function verifyRuntimeProjectBinding(env: NodeJS.ProcessEnv = process.env, request: typeof fetch = fetch) {
  const configured = configuredProjectBinding(env);
  if (!configured.valid) return { ...configured, projectIdentity: "INVALID", productionProjectActive: "NOT_CHECKED" };
  const origin = `https://${configured.expectedProject}.supabase.co`;
  async function probe(path: string, key: string, server: boolean): Promise<Status> {
    try {
      const response = await request(origin + path, {
        method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(8000),
        headers: { apikey: key, ...(server && !key.startsWith("sb_secret_") ? { authorization: `Bearer ${key}` } : {}) },
      });
      // Never parse, return or log user records from the server permission probe.
      await response.body?.cancel();
      return response.ok ? "PRESENT" : "INVALID";
    } catch { return "INVALID"; }
  }
  const [browser, server] = await Promise.all([
    probe("/auth/v1/settings", env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), false),
    probe("/auth/v1/admin/users?page=1&per_page=1", env.SUPABASE_SERVICE_ROLE_KEY!.trim(), true),
  ]);
  const valid = browser === "PRESENT" && server === "PRESENT";
  return {
    ...configured, valid, projectIdentity: valid ? "VALID" : "INVALID",
    productionProjectActive: valid ? configured.expectedProject === projects.production ? "ACTIVE" : "NOT_ACTIVE" : "NOT_CHECKED",
    statuses: { ...configured.statuses, NEXT_PUBLIC_SUPABASE_ANON_KEY: browser, SUPABASE_SERVICE_ROLE_KEY: server },
  };
}
