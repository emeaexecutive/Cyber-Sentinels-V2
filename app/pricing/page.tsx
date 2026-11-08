import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";
import { PricingCard } from "@/components/pricing-card";
import { clearancePlans } from "@/lib/billing/plans";
import { getPublicRequestLocale } from "@/lib/i18n/request-locale";
import { publicPageAlternates } from "@/lib/i18n/public-locales";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const title = locale === "es" ? "Precios | Cyber Sentinels" : "Pricing | Cyber Sentinels";
  const description = locale === "es"
    ? "Precios y acceso empresarial para flujos de trabajo de confianza operativa gobernados."
    : "Pricing and enterprise access for governed operational trust workflows.";
  return {
    ...publicSocialMetadata(title, description, locale === "es" ? "/es/pricing" : "/pricing", locale),
    title,
    description,
    alternates: publicPageAlternates("/pricing", locale),
  };
}

export const dynamic = "force-dynamic";

const features = {
  en: {
    free: ["1 verification workflow", "Basic evidence uploads", "Verification receipt preview"],
    starter: ["Up to 5 trust workflows", "Evidence and audit trail", "Enterprise workflow review"],
    professional: ["Up to 15 verification workflows", "Session integrity reviews", "Governance, receipts and replay"],
    enterprise: ["Custom workflow volume", "Five-engine TrustOps controls", "API access and pilot support"],
  },
  es: {
    free: ["1 flujo de verificación", "Carga básica de evidencias", "Vista previa del recibo de verificación"],
    starter: ["Hasta 5 flujos de confianza", "Evidencias e historial de auditoría", "Revisión empresarial del flujo de trabajo"],
    professional: ["Hasta 15 flujos de verificación", "Revisiones de integridad de sesión", "Gobernanza, recibos y Replay"],
    enterprise: ["Volumen de flujos personalizado", "Controles TrustOps de cinco motores", "Acceso a la API y soporte para pilotos"],
  },
};

const planDescriptionsEs: Record<string, string> = {
  free: "Acceso inicial para un flujo de verificación.",
  starter: "Un plan centrado en las primeras tareas de verificación operativa.",
  professional: "Flujos de confianza operativa con análisis de relaciones y auditoría.",
  enterprise: "Infraestructura de confianza para la colaboración operativa gobernada.",
};

const publicPlanCopy = {
  en: {
    free: { name: "Explore", priceLabel: "Design-partner access", href: "/enterprise-access?intent=design_partner", label: "Apply as a design partner" },
    starter: { name: "Pilot Access", priceLabel: "Pilot pricing", href: "/enterprise-access?intent=pilot", label: "Discuss a pilot" },
    professional: { name: "Professional", priceLabel: "By consultation", href: "/enterprise-access?intent=pilot", label: "Request enterprise access" },
    enterprise: { name: "Enterprise", priceLabel: "Tailored to your environment", href: "/enterprise-access", label: "Request enterprise access" },
  },
  es: {
    free: { name: "Explorar", priceLabel: "Acceso para socios de diseño", href: "/es/enterprise-access?intent=design_partner", label: "Solicitar ser socio de diseño" },
    starter: { name: "Acceso piloto", priceLabel: "Precio del piloto", href: "/es/enterprise-access?intent=pilot", label: "Consultar sobre un piloto" },
    professional: { name: "Profesional", priceLabel: "A consultar", href: "/es/enterprise-access?intent=pilot", label: "Solicitar acceso empresarial" },
    enterprise: { name: "Empresa", priceLabel: "Adaptado a tu entorno", href: "/es/enterprise-access", label: "Solicitar acceso empresarial" },
  },
} as const;

export default async function PricingPage() {
  const locale = await getPublicRequestLocale();
  const isSpanish = locale === "es";
  const plans = clearancePlans.filter((plan) => ["free", "starter", "professional", "enterprise"].includes(plan.tier));
  const copyByTier = publicPlanCopy[locale];

  return (
    <main lang={locale} className="min-h-screen bg-[#04070c] px-6 py-12 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-3xl">
          <p className="operational-eyebrow">{isSpanish ? "Planes y acceso" : "Plans & access"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">{isSpanish ? "Empieza con un flujo de trabajo." : "Start with one workflow."}</h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">{isSpanish ? "Explora con nosotros, valida un piloto y amplía según el valor demostrado." : "Explore with us, validate a pilot, then expand around proven value."}</p>
        </header>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-zinc-400">
          {isSpanish
            ? "Cyber Sentinels está abriendo plazas para algunos socios de diseño y pilotos. Las condiciones comerciales dependerán del alcance del flujo, los proveedores de evidencias, los requisitos de despliegue y las necesidades de garantía empresarial."
            : "Cyber Sentinels is opening selected design-partner and pilot engagements. Commercial terms will reflect workflow scope, evidence providers, deployment requirements and enterprise assurance needs."}
        </p>
        <section aria-label={isSpanish ? "Opciones de acceso" : "Access options"} className="pricing-grid mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const copy = copyByTier[plan.tier as keyof typeof copyByTier];
            return (
              <PricingCard
                key={plan.tier}
                name={copy.name}
                offer={copy.priceLabel}
                description={isSpanish ? planDescriptionsEs[plan.tier] : plan.description}
                features={features[locale][plan.tier as keyof typeof features.en]}
                href={copy.href}
                action={copy.label}
                preferred={plan.tier === "starter"}
              />
            );
          })}
        </section>
      </div>
    </main>
  );
}
