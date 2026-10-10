import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^[0-9a-f-]{36}\/[^\\\x00-\x1f]+$/i.test(path) || path.split("/").some(part => part === ".." || part === ".")) {
    return Response.json({ error: "Invalid evidence path" }, { status: 400, headers });
  }
  const client = await createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return Response.json({ error: "Authentication required" }, { status: 401, headers });
  // This exact helper also gates the Storage object's tenant/owner policies.
  // It checks database-owned approval, so stale JWT metadata grants no access.
  const { data: allowed, error } = await client.rpc("security_closure_evidence_object_owner", { p_object_name: path });
  if (error || allowed !== true) return Response.json({ error: "Evidence not available" }, { status: 404, headers });
  const { data: file, error: downloadError } = await createServiceRoleClient().storage.from("evidence-files").download(path);
  if (downloadError || !file) return Response.json({ error: "Evidence not available" }, { status: 404, headers });
  const recheck = await client.rpc("security_closure_evidence_object_owner", { p_object_name: path });
  if (recheck.error || recheck.data !== true) return Response.json({ error: "Evidence not available" }, { status: 404, headers });
  const name = path.split("/").at(-1)!.replace(/[^a-zA-Z0-9._-]/g, "_");
  return new Response(file, { headers: { ...headers, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"` } });
}
