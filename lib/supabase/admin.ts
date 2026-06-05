import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServiceRoleEnv } from "@/lib/env";

export function createServiceRoleClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnv(
    "Supabase service role client"
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
