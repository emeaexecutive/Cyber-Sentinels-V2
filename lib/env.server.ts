import "server-only";

import { assertEnv } from "./env";

// This module must never enter a Client Component dependency graph. Keep secret
// reads out of the shared environment helpers imported by the browser client.
export function getServiceRoleEnv(context: string) {
  assertEnv({
    context,
    names: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });

  if (process.env.VERCEL_ENV === "preview"
    && process.env.VERCEL_PROJECT_ID === "prj_nLXKcloPF9ZUBsiGAkyVWOJe1OOk"
    && (process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://agpyhygpfmppjkxwcpac.supabase.co"
      || (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== "https://agpyhygpfmppjkxwcpac.supabase.co"))) {
    throw new Error("ACCEPTANCE_SUPABASE_BINDING_NOT_APPROVED");
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  };
}
