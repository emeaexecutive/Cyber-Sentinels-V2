import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServiceRoleEnv } from "@/lib/env";

// Auth only, after application Siteverify. Supabase exempts the server admin
// credential from its own CAPTCHA check, avoiding consuming a token twice.
// Public/anon Auth must independently have CAPTCHA enabled in Supabase.
export async function createProtectedAuthClient() {
  const { supabaseUrl, serviceRoleKey } = getServiceRoleEnv("Protected authentication");
  const jar = await cookies();
  return createServerClient(supabaseUrl, serviceRoleKey, {
    cookies: {
      getAll: () => [],
      setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
}
