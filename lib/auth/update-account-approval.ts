import "server-only";
import { requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const statuses = ["APPROVED", "REJECTED", "SUSPENDED", "REVOKED"] as const;

/** Actor identity is taken only from the verified admin session, never the form. */
export async function updateAccountApproval(formData: FormData) {
  const admin = await requireAdminPageAccess(await createClient(), {
    path: "/admin/access-approvals", action: "update_account_access_approval",
  });
  const userId = String(formData.get("user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ||
      !statuses.some(value => value === status)) throw new Error("Invalid account approval transition.");
  if (!reason || reason.length > 1000) throw new Error("An approval reason of 1–1000 characters is required.");
  if (status === "APPROVED" && userId === admin.id) {
    throw new Error("Platform administrators cannot approve their own account.");
  }
  const { error } = await createServiceRoleClient().rpc("set_account_access_status", {
    p_user_id: userId, p_status: status, p_actor_user_id: admin.id, p_reason: reason,
  });
  if (error) throw new Error("Could not update account access approval.");
}
