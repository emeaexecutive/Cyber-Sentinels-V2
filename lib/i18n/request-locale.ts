import { headers } from "next/headers";
import type { PublicLocale } from "./public-locales";

export async function getPublicRequestLocale(): Promise<PublicLocale> {
  return (await headers()).get("x-public-locale") === "es" ? "es" : "en";
}
