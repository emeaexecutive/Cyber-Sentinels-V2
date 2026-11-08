import type { Metadata } from "next";
import { publicPageAlternates } from "./public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";

export const spanishPublicationNotices = {
  "/regulatory": "Información regulatoria",
  "/media-centre": "Sala de prensa",
  "/our-people": "Nuestro equipo",
  "/careers": "Trabaja con nosotros",
  "/accessibility": "Accesibilidad",
  "/privacy": "Información y preferencias de privacidad",
  "/terms": "Condiciones de uso",
  "/cookies": "Información sobre cookies",
  "/legal": "Información legal",
  "/modern-slavery": "Declaración sobre esclavitud moderna",
  "/security": "Seguridad y comunicación responsable de vulnerabilidades",
} as const;
export type SpanishNoticePath = keyof typeof spanishPublicationNotices;
export function spanishNoticeMetadata(path: SpanishNoticePath): Metadata {
  const title = `${spanishPublicationNotices[path]} | Cyber Sentinels`;
  const description = "El contenido de esta página está en revisión. Todavía no se ha publicado una versión aprobada.";
  return { title, description, robots: { index: false, follow: true },
    alternates: publicPageAlternates(path, "es"),
    ...publicSocialMetadata(title, description, `/es${path}`, "es") };
}
