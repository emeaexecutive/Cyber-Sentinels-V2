"use client";

import { useEffect, useState } from "react";

export type ConsentLocale = "en" | "es";

const spanish = {
  trustPreferences: "Preferencias de confianza",
  consentHeading: "Su privacidad. Su confianza.",
  consentDescription: "Cyber Sentinels utiliza tecnologías esenciales para proteger su cuenta y tecnologías opcionales para mejorar su experiencia. Usted mantiene el control.",
  firstChoiceNotice: "Escape no cierra este primer aviso de elección; seleccione una opción o abra las preferencias.",
  acceptAll: "Aceptar todo",
  rejectOptional: "Rechazar lo opcional",
  managePreferences: "Gestionar preferencias",
  savePreferences: "Guardar preferencias",
  cancel: "Cancelar",
  closePreferences: "Cerrar las preferencias de cookies",
  privacyStatus: "Estado de privacidad",
  essentialSecurity: "Seguridad esencial",
  functional: "Funcionales",
  analytics: "Analítica",
  aiImprovements: "Mejoras de IA",
  marketing: "Marketing",
  enabled: "Activado",
  disabled: "Desactivado",
  privacyLevel: "Nivel de privacidad",
  receiptStatus: "Estado del recibo",
  high: "Alto",
  broad: "Amplio",
  custom: "Personalizado",
  retry: "Reintentar sincronización del recibo",
  retrying: "Reintentando la sincronización…",
  informational: "Solo informativo: no es una certificación ni garantía legal o de seguridad.",
  policy: "Política",
  optionalOff: "Las categorías opcionales permanecen desactivadas salvo que las habilite.",
  withdraw: "Retirar el consentimiento opcional",
  alwaysEnabled: "Siempre activado",
  purpose: "Finalidad",
  legalBasis: "Base jurídica",
  providers: "Proveedores",
  storage: "Almacenamiento",
  retention: "Conservación",
  classification: "Clasificación",
  lastUpdated: "Última actualización",
  required: "Obligatoria",
  optional: "Opcional",
  consentFor: "consentimiento para",
  dismiss: "Cerrar la notificación de preferencias guardadas",
  browserStorageError: "Su navegador no pudo guardar esta preferencia. Revise la configuración de almacenamiento e inténtelo de nuevo.",
  serverRejected: "El servidor rechazó este recibo. Revise su elección de privacidad e inténtelo de nuevo.",
  savedSynced: "Elección de privacidad guardada y recibo conservado.",
  savedLocallyUnavailable: "Elección de privacidad guardada localmente. La conservación del recibo no está disponible temporalmente.",
  savedLocallyRejected: "Elección de privacidad guardada localmente, pero el servidor rechazó el recibo.",
  savedPending: "Elección de privacidad guardada localmente. La sincronización del recibo está pendiente.",
  consentTimeline: "Cronología de consentimiento™",
  consentHistoryDescription: "Historial de cambios de sus preferencias de confianza que no se puede modificar.",
  historyUnavailable: "El historial no está disponible.",
  noHistory: "Aún no hay historial de consentimiento conservado.",
  consentReceipt: "Recibo de consentimiento™",
  action: "Acción",
  occurred: "Fecha",
  integrity: "Integridad",
  unknown: "Desconocido",
  unavailable: "No disponible",
} as const;

export function consentLocale(pathname: string, search = ""): ConsentLocale {
  if (pathname === "/es" || pathname.startsWith("/es/")) return "es";
  return new URLSearchParams(search.replace(/^\?/, "")).get("lang")?.toLowerCase() === "es" ? "es" : "en";
}

export function useConsentLocale(pathname?: string, initialLocale: ConsentLocale = "en"): ConsentLocale {
  const [locale, setLocale] = useState<ConsentLocale>(initialLocale);

  useEffect(() => {
    setLocale(consentLocale(pathname ?? window.location.pathname, window.location.search));
  }, [pathname]);

  return locale;
}

export function consentText(locale: ConsentLocale, key: keyof typeof spanish, fallback: string) {
  return locale === "es" ? spanish[key] : fallback;
}

const categories = {
  essential: {
    name: "Esenciales",
    description: "Necesarias para la autenticación, la seguridad de sesión, la protección CSRF, la prevención del fraude, la prestación del servicio y el almacenamiento del consentimiento.",
  },
  functional: {
    name: "Funcionales",
    description: "Recuerdan ajustes de visualización opcionales y permiten comportamientos no esenciales de la interfaz.",
  },
  analytics: {
    name: "Analítica",
    description: "Mide el uso y el rendimiento anónimos del producto para mejorar el servicio.",
  },
  ai_improvements: {
    name: "Mejoras de IA",
    description: "Permite evaluar funciones minimizando la privacidad y la calidad del asistente cuando esté permitido. Los datos confidenciales del cliente o personales no se incluyen automáticamente.",
  },
  marketing: {
    name: "Marketing",
    description: "Permite atribución de campañas, publicidad, redireccionamiento y seguimiento en redes sociales cuando esté configurado.",
  },
} as const;

export function localizedConsentCategory(locale: ConsentLocale, key: keyof typeof categories, fallbackName: string, fallbackDescription: string) {
  if (locale === "en") return { name: fallbackName, description: fallbackDescription };
  return categories[key];
}
