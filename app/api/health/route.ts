import { createPublicApiContext, publicApiSuccess } from "@/lib/api/public-contracts";

export function GET(request: Request) {
  return publicApiSuccess({ status: "ok" }, createPublicApiContext(request, "health"));
}
