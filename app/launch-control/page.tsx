import { redirect } from "next/navigation";
import { checkAdminAccess, requireAdminPageAccess } from "@/lib/auth/isAdmin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LaunchControlEntryPage() {
  const supabase = await createClient();
  const access = await checkAdminAccess(supabase);

  if (!access.ok) {
    if (access.reason === "unauthenticated") {
      redirect("/login?next=/launch-control");
    }

    redirect("/back-office?denied=1");
  }

  await requireAdminPageAccess(supabase, { path: "/launch-control" });
  redirect("/admin/launch-control");
}
