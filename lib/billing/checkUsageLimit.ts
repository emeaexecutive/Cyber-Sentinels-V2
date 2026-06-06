import type { User } from "@supabase/supabase-js";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import { getPlan } from "@/lib/billing/plans";
import { getUserPlan } from "@/lib/billing/getUserPlan";
import type { createClient } from "@/lib/supabase/server";
import type { UserPlan } from "@/types/billing";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UsageLimitFeature =
  | "passport"
  | "evidence_upload"
  | "trust_graph"
  | "governance"
  | "api_access";

export type UsageLimitResult =
  | { ok: true; plan: UserPlan; limit: number | null }
  | {
      ok: false;
      plan: UserPlan;
      limit: number | null;
      current: number;
      reason: string;
    };

async function countRows(
  supabase: SupabaseServerClient,
  table: string,
  column: string,
  value: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) {
    console.error("billing usage count failed", {
      table,
      column,
      message: error.message,
      code: error.code,
    });
    return 0;
  }

  return count ?? 0;
}

export async function checkUsageLimit(
  supabase: SupabaseServerClient,
  user: Pick<User, "id" | "email"> | null,
  feature: UsageLimitFeature
): Promise<UsageLimitResult> {
  if (!user) {
    return {
      ok: false,
      plan: "free",
      limit: 0,
      current: 0,
      reason: "Authentication required.",
    };
  }

  if (isAdminAllowlisted(user.email)) {
    return { ok: true, plan: "enterprise", limit: null };
  }

  const planName = await getUserPlan(supabase, user);
  const plan = getPlan(planName);

  if (feature === "trust_graph") {
    return plan.trust_graph_enabled
      ? { ok: true, plan: planName, limit: null }
      : {
          ok: false,
          plan: planName,
          limit: null,
          current: 0,
          reason: "Trust graph access requires Professional, Premium or Enterprise.",
        };
  }

  if (feature === "governance") {
    return plan.governance_enabled
      ? { ok: true, plan: planName, limit: null }
      : {
          ok: false,
          plan: planName,
          limit: null,
          current: 0,
          reason: "Governance workflows require Premium or Enterprise.",
        };
  }

  if (feature === "api_access") {
    return plan.api_access_enabled
      ? { ok: true, plan: planName, limit: null }
      : {
          ok: false,
          plan: planName,
          limit: null,
          current: 0,
          reason: "API access requires Enterprise.",
        };
  }

  if (feature === "passport") {
    const limit = plan.passport_limit;

    if (limit === null) {
      return { ok: true, plan: planName, limit };
    }

    const current = await countRows(
      supabase,
      "passports",
      "user_email",
      user.email ?? user.id
    );

    return current < limit
      ? { ok: true, plan: planName, limit }
      : {
          ok: false,
          plan: planName,
          limit,
          current,
          reason: `Your ${plan.name} plan allows ${limit} passport${limit === 1 ? "" : "s"}.`,
        };
  }

  const limit = plan.evidence_upload_limit;

  if (limit === null) {
    return { ok: true, plan: planName, limit };
  }

  const current = await countRows(
    supabase,
    "evidence_files",
    "uploaded_by",
    user.email ?? user.id
  );

  return current < limit
    ? { ok: true, plan: planName, limit }
    : {
        ok: false,
        plan: planName,
        limit,
        current,
        reason: `Your ${plan.name} plan allows ${limit} evidence uploads.`,
      };
}
