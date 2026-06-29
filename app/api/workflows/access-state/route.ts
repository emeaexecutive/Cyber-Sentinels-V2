import { accessGovernanceResponse } from "@/lib/access-governance-api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return accessGovernanceResponse(request, "access_state");
}
