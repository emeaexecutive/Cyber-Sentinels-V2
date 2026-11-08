import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...publicSocialMetadata("Modern Slavery Statement | Cyber Sentinels", "Cyber Sentinels responsible operations and modern slavery statement.", "/modern-slavery"),
  title: "Modern Slavery Statement | Cyber Sentinels",
  description: "Cyber Sentinels responsible operations and modern slavery statement.",
  alternates: publicPageAlternates("/modern-slavery"),
};

export { default } from "@/app/modern-slavery-statement/page";
