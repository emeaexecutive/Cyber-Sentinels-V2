import { publicSocialMetadata } from "@/lib/search/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...publicSocialMetadata("About | Cyber Sentinels", "Why Cyber Sentinels is building operational trust infrastructure for accountable enterprise workflows.", "/about"),
  title: "About | Cyber Sentinels",
  description: "Why Cyber Sentinels is building operational trust infrastructure for accountable enterprise workflows.",
  alternates: { canonical: "/about" },
};

export { default } from "@/app/about-us/page";
