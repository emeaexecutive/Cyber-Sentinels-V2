"use client";

import { useConsentLocale } from "@/src/lib/consent/localization";

export function PrivacyCookiesHeading() {
  const spanish = useConsentLocale() === "es";
  return (
    <>
      <p className="text-sm uppercase tracking-[0.16em] text-cyan-300">{spanish ? "Catálogo de cookies y rastreadores" : "Cookie & Tracker Catalogue"}</p>
      <h1 className="mt-3 text-4xl font-semibold">{spanish ? "Tecnologías por finalidad" : "Technologies by purpose"}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
        {spanish
          ? "Los rastreadores desconocidos se bloquean y nunca se clasifican automáticamente como esenciales. Las entradas específicas de proveedores aparecen solo después de su configuración y revisión."
          : "Unknown trackers are blocked and never classified as Essential automatically. Provider-specific entries appear only after configuration and review."}
      </p>
    </>
  );
}
