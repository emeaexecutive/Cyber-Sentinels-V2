import { handleFakeActorActionRequest } from "@/lib/admin/fake-actor-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleFakeActorActionRequest(request, (await params).id, "remove");
}
