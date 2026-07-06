import { createProviderAdapter } from "./factory.ts";
export const stripeIdentityProvider = createProviderAdapter({ providerName: "Stripe Identity", env: ["STRIPE_SECRET_KEY"], supportedSignals: ["identity", "document"] });
