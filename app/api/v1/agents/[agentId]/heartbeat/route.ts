import { ingestSwarmHeartbeat } from "@/lib/swarm/runtime-heartbeat-server";
import { boundedJson, publicApiResponse } from "@/lib/public-api/v1/contracts";
import { withPublicApi } from "@/lib/public-api/v1/handler";
import { ingestControlPlaneHeartbeat } from "@/lib/public-api/v1/control-plane-evidence";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  return withPublicApi(request, {
    route: "/api/v1/agents/{agentId}/heartbeat", routeClass: "proof", scopes: ["agents:verify"],
  }, async ({ principal, correlationId, requestId }) => {
    const body = await boundedJson(request, 4096);
    const result = await (body.mode === "swarm" ? ingestSwarmHeartbeat : ingestControlPlaneHeartbeat)(principal, decodeURIComponent(agentId), body, `${new URL(request.url).origin}/api/v1`);
    return publicApiResponse(result, { status: 201 }, correlationId, requestId);
  });
}
