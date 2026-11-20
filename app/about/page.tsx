import { publicPageAlternates } from "@/lib/i18n/public-locales";
import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...publicSocialMetadata(
    "Our Story | Cyber Sentinels",
    "The story behind TENENTE™, its inspiration in watchfulness and guardianship, and the founder's connection to Aragón, Spain.",
    "/about",
  ),
  title: "Our Story | Cyber Sentinels",
  description:
    "The story behind TENENTE™, its inspiration in watchfulness and guardianship, and the founder's connection to Aragón, Spain.",
  alternates: publicPageAlternates("/about"),
};

export { default } from "@/app/about-us/page";
