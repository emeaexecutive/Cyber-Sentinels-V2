import type { Metadata } from "next";
import { publicSocialMetadata as social } from "@/lib/search/metadata";
import { publicPageAlternates as alternates } from "./public-locales";
export * from "@/lib/search/metadata";
export function publicPageAlternates(path: string) {
  return alternates(path.startsWith("/es/") ? path.slice(3) : path === "/es" ? "/" : path, "es");
}
export function publicSocialMetadata(title: string, description: string, path: string) {
  return social(title, description, path.startsWith("/es") ? path : `/es${path === "/" ? "" : path}`, "es");
}
export function translatedMetadata(sourcePath: string, metadata: Metadata): Metadata {
  return { ...metadata, alternates: alternates(sourcePath, "es") };
}
