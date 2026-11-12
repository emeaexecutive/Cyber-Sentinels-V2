import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...publicSocialMetadata("Modern Slavery Statement | Cyber Sentinels", "Publication status: this page is under review; an approved version has not been published.", "/modern-slavery"),
  title: "Modern Slavery Statement | Cyber Sentinels",
  description: "Publication status: this page is under review; an approved version has not been published.",
  alternates: publicPageAlternates("/modern-slavery"),
};

export { default } from "@/app/modern-slavery-statement/page";
