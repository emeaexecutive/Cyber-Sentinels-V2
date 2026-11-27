import "server-only";
import { ModelBudgetError, SocModelBudget, type ModelBudgetConfiguration } from "./model-budget.ts";

const policyFields = ["approved", "environment", "tenantId", "scope", "policyVersion", "provider", "model", "windowMs", "maxWindowCalls", "maxTotalCalls", "maxAttemptsPerInvestigation", "maxParallel", "maxDurationMs", "maxInputBytes", "maxOutputTokens", "maxWindowSpendMicros", "maxTotalSpendMicros", "reserveMicrosPerCall", "projectRef"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const productionProject = "kecgtsfibkypjuaxqbjx";
function denied(): never { throw new ModelBudgetError("SOC_MODEL_SERVER_CONFIGURATION_DENIED"); }
function object(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }

/** Explicit operator opt-in, read only on the server after tenant authentication.
 * Empty means disabled. No approval, project, tenant, price or spend is inferred.
 * A service-role client's actual URL comes from NEXT_PUBLIC_SUPABASE_URL. */
export function configuredSocModelBudget(tenantId: string, env: NodeJS.ProcessEnv = process.env): ModelBudgetConfiguration | undefined {
  const serialized = env.TENENTE_SOC_MODEL_BUDGETS?.trim();
  if (!serialized) return undefined;
  if (serialized.length > 32768 || env.VERCEL_ENV === "production" || env.CYBER_SENTINELS_ENVIRONMENT?.toLowerCase() === "production") denied();
  if (env.VERCEL_ENV ? env.VERCEL_ENV !== "preview" : !["test", "development"].includes(env.NODE_ENV ?? "")) denied();
  if (!uuid.test(tenantId) || !env.OPENAI_API_KEY?.trim() || !env.OPENAI_SOC_MODEL?.trim()) denied();
  let policies: unknown;
  try { policies = JSON.parse(serialized); } catch { return denied(); }
  if (!object(policies) || Object.keys(policies).length > 50 || !Object.keys(policies).every(key => uuid.test(key))) denied();
  // A configured map does not grant unlisted authenticated tenants a budget.
  if (!Object.hasOwn(policies, tenantId)) return undefined;
  const entry = policies[tenantId];
  if (!object(entry) || Object.keys(entry).length !== policyFields.length || !policyFields.every(key => Object.hasOwn(entry, key))) denied();
  if (entry.tenantId !== tenantId || entry.provider !== "openai" || entry.model !== env.OPENAI_SOC_MODEL || typeof entry.projectRef !== "string" || !/^[a-z]{20}$/.test(entry.projectRef) || entry.projectRef === productionProject) denied();
  let actual: URL;
  try { actual = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? ""); } catch { return denied(); }
  if (actual.origin !== `https://${entry.projectRef}.supabase.co` || actual.username || actual.password || actual.pathname !== "/" || actual.search || actual.hash) denied();
  if (env.SUPABASE_URL && env.SUPABASE_URL !== actual.origin && env.SUPABASE_URL !== actual.href) denied();
  const configuration = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "projectRef")) as unknown as ModelBudgetConfiguration;
  // Reuse the actual execution validator; this cannot perform persistence or a
  // provider call. Return the validated immutable configuration, never the key.
  return new SocModelBudget({ now: () => 0, store: { transact: async () => denied() } }, configuration).configuration;
}
