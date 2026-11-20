"use client";

import Link from "next/link";
import { useConsentLocale } from "@/src/lib/consent/localization";

export function PrivacyPageContent() {
  const spanish = useConsentLocale() === "es";
  const links = spanish
    ? [
        ["/privacy/preferences?lang=es", "Gestionar preferencias de confianza", "Revise o cambie cada categoría opcional."],
        ["/privacy/cookies?lang=es", "Catálogo de cookies y rastreadores", "Consulte proveedores, finalidades, almacenamiento y conservación."],
        ["/privacy/consent-history?lang=es", "Cronología de consentimiento™", "Revise recibos de consentimiento™ no modificables."],
      ]
    : [
        ["/privacy/preferences", "Manage Trust Preferences", "Review or change every optional category."],
        ["/privacy/cookies", "Cookie & Tracker Catalogue", "See providers, purposes, storage and retention."],
        ["/privacy/consent-history", "Consent Timeline™", "Review append-only Consent Receipts™."],
      ];

  return (
    <main className="min-h-screen bg-[#04070c] px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.18em] text-cyan-300">Enterprise Trust Consent Manager™</p>
        <h1 className="mt-4 text-4xl font-semibold">{spanish ? "Privacidad y preferencias de confianza" : "Privacy and Trust Preferences"}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300">
          {spanish
            ? "Cyber Sentinels utiliza tecnologías esenciales para prestar el servicio de forma segura. Las tecnologías opcionales Funcionales, de Analítica, Mejoras de IA y Marketing permanecen bajo su control. El sistema conserva evidencia auditable de las preferencias; no constituye una certificación legal ni una garantía universal de cumplimiento."
            : "Cyber Sentinels uses essential technologies for secure service delivery. Optional Functional, Analytics, AI Improvements and Marketing technologies remain under your control. This system provides auditable preference evidence; it is not a legal certification or universal compliance guarantee."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {links.map(([href, title, body]) => (
            <Link key={href} href={href} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 hover:border-cyan-800">
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{body}</p>
            </Link>
          ))}
        </div>
        <p role="status" className="mt-8 text-sm text-amber-100">{spanish ? "El aviso de privacidad está en revisión. Todavía no se ha publicado una versión aprobada." : "The privacy notice is under review. An approved version has not been published."}</p>
        <section className="mt-10 grid gap-5 rounded-xl border border-zinc-800 bg-black p-6">
          <h2 className="text-2xl font-semibold">{spanish ? "Principios de privacidad" : "Privacy principles"}</h2>
          <p className="text-sm leading-7 text-zinc-400">
            {spanish
              ? "Los identificadores de cuenta, la evidencia de flujos gobernados y los registros de auditoría se tratan únicamente para finalidades de servicio documentadas. Las direcciones IP completas, los secretos de autenticación sin procesar, las huellas de dispositivo sin restricción y las cadenas de agente de usuario innecesarias no se almacenan en los registros de consentimiento. La conservación y el ejercicio de derechos siguen sujetos a la política del cliente, los contratos y la revisión aplicable. Esta versión en español requiere la aprobación final de privacidad/legal antes de publicación."
              : "Account identifiers, governed workflow evidence and audit records are processed only for documented service purposes. Full IP addresses, raw authentication secrets, unrestricted device fingerprints and unnecessary user-agent strings are not stored in consent records. Retention and rights handling remain subject to customer policy, contracts and applicable review."}
          </p>
          <p className="text-sm text-zinc-400">
            {spanish ? "Solicitudes de privacidad:" : "Privacy requests:"} privacy@cybersentinels.ai · {spanish ? "Informes de seguridad:" : "Security reports:"} security@cybersentinels.ai
          </p>
        </section>
      </div>
    </main>
  );
}
