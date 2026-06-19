export type RequiredEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "NEXT_PUBLIC_SITE_URL"
  | "ADMIN_EMAILS"
  | "ADMIN_ACCESS_CODE"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRO_MONTHLY_PRICE_ID";

type EnvValidationOptions = {
  context: string;
  names: RequiredEnvName[];
  log?: boolean;
};

export const requiredEnvNames: RequiredEnvName[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

type EnvLogState = typeof globalThis & {
  __cyberSentinelsMissingEnvWarnings?: Set<string>;
};

function missingEnvWarnings() {
  const state = globalThis as EnvLogState;
  state.__cyberSentinelsMissingEnvWarnings ??= new Set<string>();
  return state.__cyberSentinelsMissingEnvWarnings;
}

export function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function getMissingEnv(names: RequiredEnvName[]) {
  return names.filter((name) => !String(process.env[name] ?? "").trim());
}

export function logMissingEnv(context: string, missing: RequiredEnvName[]) {
  if (missing.length === 0 || isProductionBuildPhase()) {
    return;
  }

  const warningKey = [...missing].sort().join(",");
  const warnings = missingEnvWarnings();
  if (warnings.has(warningKey)) {
    return;
  }
  warnings.add(warningKey);

  console.error("Environment configuration missing.", {
    context,
    missing,
  });
}

export function hasPublicSupabaseEnv() {
  return getMissingEnv(requiredEnvNames).length === 0;
}

export function isEnvConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("Missing required environment variables")
  );
}

export function getPublicEnvDiagnostics() {
  return {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasAppUrl: Boolean(
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
    ),
  };
}

export function logPublicEnvDiagnostics(context: string) {
  if (isProductionBuildPhase()) {
    return;
  }

  console.error("Cyber Sentinels environment diagnostics.", {
    context,
    ...getPublicEnvDiagnostics(),
  });
}

export function assertEnv({
  context,
  names,
  log = true,
}: EnvValidationOptions) {
  const missing = getMissingEnv(names);

  if (missing.length > 0) {
    if (log) {
      logMissingEnv(context, missing);
    }

    throw new Error(
      `Missing required environment variables for ${context}: ${missing.join(", ")}`
    );
  }
}

export function validateRuntimeEnv(context = "runtime") {
  assertEnv({ context, names: requiredEnvNames });
}

export function getPublicSupabaseEnv(context: string) {
  const missing: RequiredEnvName[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (missing.length > 0) {
    logMissingEnv(context, missing);
    throw new Error(
      `Missing required environment variables for ${context}: ${missing.join(", ")}`
    );
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}

export function getServiceRoleEnv(context: string) {
  assertEnv({
    context,
    names: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  };
}

export function getAdminEmailsEnv(context: string) {
  assertEnv({ context, names: ["ADMIN_EMAILS"] });

  return process.env.ADMIN_EMAILS as string;
}

export function getAdminAccessCodeEnv(context: string) {
  assertEnv({ context, names: ["ADMIN_ACCESS_CODE"] });

  return process.env.ADMIN_ACCESS_CODE as string;
}

export function getSiteUrlEnv(context: string) {
  assertEnv({ context, names: ["NEXT_PUBLIC_SITE_URL"] });

  return process.env.NEXT_PUBLIC_SITE_URL as string;
}

export function getStripeSecretKeyEnv(context: string) {
  assertEnv({ context, names: ["STRIPE_SECRET_KEY"] });

  return process.env.STRIPE_SECRET_KEY as string;
}

export function getStripeWebhookSecretEnv(context: string) {
  assertEnv({ context, names: ["STRIPE_WEBHOOK_SECRET"] });

  return process.env.STRIPE_WEBHOOK_SECRET as string;
}

export function getStripeProPriceIdEnv(context: string) {
  assertEnv({ context, names: ["STRIPE_PRO_MONTHLY_PRICE_ID"] });

  return process.env.STRIPE_PRO_MONTHLY_PRICE_ID as string;
}
