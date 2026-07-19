import { isUuid } from "@/lib/identity-signals/core";
import { resolveIdentityEnterprise } from "@/lib/identity-signals/enterprise-context";
import { identityFailure, identitySuccess } from "@/lib/identity-signals/http";
import { identityRepository } from "@/lib/identity-signals/repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await resolveIdentityEnterprise(request); const { id } = await params; if (!isUuid(id)) throw new Error("A valid subject id is required."); await identityRepository().assertSubject(context.enterpriseId, id); return identitySuccess({ subjectId: id, signals: await identityRepository().subjectSignals(context.enterpriseId, id) }); }
  catch (error) { return identityFailure(error); }
}
