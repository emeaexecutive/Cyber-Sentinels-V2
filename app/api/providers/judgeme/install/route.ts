import { checkRequestRateLimit } from "@/lib/security";
import { resolveIdentityEnterprise, IdentityApiError } from "@/lib/identity-signals/enterprise-context";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getJudgeMePrivateConfig, getSiteUrlEnv } from "@/lib/env";
import { installJudgeMeStore } from "@/lib/providers/judgeme-installation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const webhookPaths = [
  ["review/created", "review-created"],
  ["review/updated", "review-updated"],
  ["review/created_fail", "review-created-fail"],
] as const;

async function providerJson(response: Response) {
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 65_536) throw new Error("JUDGEME_PROVIDER_REQUEST_FAILED");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 65_536) throw new Error("JUDGEME_PROVIDER_RESPONSE_TOO_LARGE");
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as Record<string, unknown>; }
  catch { throw new Error("JUDGEME_PROVIDER_RESPONSE_INVALID"); }
}

function apiUrl(path: string, shopDomain: string) {
  const url = new URL(`https://api.judge.me/api/v1/${path}`);
  url.searchParams.set("shop_domain", shopDomain);
  return url;
}

async function judgeMeRequest(path: string, shopDomain: string, token: string, init: RequestInit = {}) {
  return fetch(apiUrl(path, shopDomain), {
    ...init,
    headers: { accept: "application/json", "X-Api-Token": token, ...(init.body ? { "content-type": "application/json" } : {}), ...init.headers },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
}

export async function POST(request: Request) {
  const limited = checkRequestRateLimit({ route: "judgeme-installation", req: request, limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const context = await resolveIdentityEnterprise(request, ["owner", "admin"]);
    const config = getJudgeMePrivateConfig("Judge.me installation");
    const appOrigin = new URL(getSiteUrlEnv("Judge.me webhook registration")).origin;
    const installed = await installJudgeMeStore({ enterpriseId: context.enterpriseId, installedBy: context.user.id, configuredShopDomain: config.shopDomain }, {
      async verifyShop(shopDomain) {
        const body = await providerJson(await judgeMeRequest("shops/info", shopDomain, config.privateApiToken));
        const shop = body.shop && typeof body.shop === "object" ? body.shop as Record<string, unknown> : {};
        if (typeof shop.domain !== "string") throw new Error("JUDGEME_SHOP_DOMAIN_UNVERIFIED");
        return { shopDomain: shop.domain };
      },
      async findInstallation(shopDomain) {
        const result = await createServiceRoleClient().from("judgeme_installations").select("id,enterprise_id,shop_domain,status").eq("shop_domain", shopDomain).maybeSingle();
        if (result.error) throw new Error("JUDGEME_INSTALLATION_LOOKUP_FAILED");
        return result.data ? { id: result.data.id, enterpriseId: result.data.enterprise_id, shopDomain: result.data.shop_domain, status: result.data.status } : null;
      },
      async createInstallation(values) {
        const result = await createServiceRoleClient().from("judgeme_installations").insert({ enterprise_id: values.enterpriseId, shop_domain: values.shopDomain, installed_by: values.installedBy, status: "active" }).select("id,enterprise_id,shop_domain,status").single();
        if (result.error || !result.data) throw new Error(result.error?.code === "23505" ? "JUDGEME_SHOP_ALREADY_BOUND" : "JUDGEME_INSTALLATION_CREATE_FAILED");
        return { id: result.data.id, enterpriseId: result.data.enterprise_id, shopDomain: result.data.shop_domain, status: result.data.status };
      },
      async registerWebhooks(installation) {
        const existingBody = await providerJson(await judgeMeRequest("webhooks", installation.shopDomain, config.privateApiToken));
        const current = Array.isArray(existingBody.webhooks) ? existingBody.webhooks as Array<Record<string, unknown>> : [];
        for (const [key, slug] of webhookPaths) {
          const callback = new URL(`/api/providers/judgeme/webhook/${installation.id}/${slug}`, appOrigin).href;
          if (current.some((item) => item.key === key && item.url === callback)) continue;
          await providerJson(await judgeMeRequest("webhooks", installation.shopDomain, config.privateApiToken, {
            method: "POST", body: JSON.stringify({ webhook: { key, url: callback } }),
          }));
        }
      },
    });
    return Response.json({ ok: true, installation: installed }, { status: 201, headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IdentityApiError) return Response.json({ ok: false, error: error.code }, { status: error.status });
    const code = error instanceof TypeError ? error.message : "JUDGEME_INSTALLATION_UNAVAILABLE";
    const status = code === "JUDGEME_SHOP_ALREADY_BOUND" ? 409 : code.includes("INVALID") || code.includes("MISMATCH") ? 400 : 503;
    return Response.json({ ok: false, error: code }, { status });
  }
}