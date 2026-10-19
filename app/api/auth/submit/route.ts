import { createProtectedAuthHandler } from "@/lib/auth/protected-auth";
import { createProtectedAuthClient } from "@/lib/supabase/protected-auth";
export const dynamic = "force-dynamic";
export const POST = createProtectedAuthHandler(async ({ operation, email, password, redirectTo }) => {
  const client = await createProtectedAuthClient();
  switch (operation) {
    case "password": return client.auth.signInWithPassword({ email, password });
    case "signup": return client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    case "resend": return client.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirectTo } });
    case "magic-link": return client.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
  }
});
