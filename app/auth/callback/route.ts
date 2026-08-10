import { handleAuthCallback } from "@/lib/auth/callback-handler";
import { captureOperationalIssue } from "@/lib/operational-monitoring";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  return handleAuthCallback(req, { createClient, captureOperationalIssue });
}
