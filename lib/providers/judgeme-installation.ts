export type JudgeMeInstallationRecord = {
  id: string;
  enterpriseId: string;
  shopDomain: string;
  status: "active" | "uninstalled" | "suspended";
};

export type JudgeMeInstallationDependencies = {
  verifyShop: (shopDomain: string) => Promise<{ shopDomain: string }>;
  findInstallation: (shopDomain: string) => Promise<JudgeMeInstallationRecord | null>;
  createInstallation: (input: { enterpriseId: string; shopDomain: string; installedBy: string }) => Promise<JudgeMeInstallationRecord>;
  registerWebhooks: (installation: JudgeMeInstallationRecord) => Promise<void>;
};

const shopPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function installJudgeMeStore(input: {
  enterpriseId: string;
  installedBy: string;
  configuredShopDomain: string;
}, dependencies: JudgeMeInstallationDependencies) {
  const shopDomain = input.configuredShopDomain.trim().toLowerCase();
  if (!uuidPattern.test(input.enterpriseId) || !uuidPattern.test(input.installedBy)) throw new TypeError("JUDGEME_INSTALLATION_ACTOR_INVALID");
  if (!shopPattern.test(shopDomain) || !shopDomain.endsWith(".myshopify.com")) throw new TypeError("JUDGEME_SHOP_DOMAIN_INVALID");

  const verifiedShop = await dependencies.verifyShop(shopDomain);
  if (verifiedShop.shopDomain.trim().toLowerCase() !== shopDomain) throw new TypeError("JUDGEME_SHOP_AUTHENTICATION_MISMATCH");

  let installation = await dependencies.findInstallation(shopDomain);
  if (installation && installation.enterpriseId !== input.enterpriseId) throw new TypeError("JUDGEME_SHOP_ALREADY_BOUND");
  if (installation && installation.status !== "active") throw new TypeError("JUDGEME_INSTALLATION_NOT_ACTIVE");
  if (!installation) installation = await dependencies.createInstallation({ enterpriseId: input.enterpriseId, shopDomain, installedBy: input.installedBy });
  if (installation.enterpriseId !== input.enterpriseId || installation.shopDomain !== shopDomain || installation.status !== "active") throw new TypeError("JUDGEME_INSTALLATION_BINDING_MISMATCH");

  await dependencies.registerWebhooks(installation);
  return { installationId: installation.id, enterpriseId: installation.enterpriseId, shopDomain: installation.shopDomain, status: installation.status };
}