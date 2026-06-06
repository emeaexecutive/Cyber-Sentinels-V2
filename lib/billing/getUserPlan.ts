import type { User } from "@supabase/supabase-js";
import { isAdminAllowlisted } from "@/lib/admin-auth";
import type { createClient } from "@/lib/supabase/server";
import type { UserPlan } from "@/types/billing";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const activeSubscriptionStatuses = new Set(["active", "trialing"]);

function normalizePlan(value: unknown): UserPlan {
  if (
    value === "starter" ||
    value === "professional" ||
    value === "premium" ||
    value === "enterprise"
  ) {
    return value;
  }

  if (value === "pro") {
    return "professional";
  }

  return "free";
}

export async function getUserPlan(
  supabase: SupabaseServerClient,
  user: Pick<User, "id" | "email"> | null
): Promise<UserPlan> {
  if (!user) {
    return "free";
  }

  if (isAdminAllowlisted(user.email)) {
    return "enterprise";
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("billing subscription lookup failed", error);
    return "free";
  }

  if (!data || !activeSubscriptionStatuses.has(String(data.status))) {
    return "free";
  }

  return normalizePlan(data.plan);
}
