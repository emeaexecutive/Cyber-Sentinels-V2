import type { MetadataRoute } from "next";
import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";

const baseUrl = "https://www.cybersentinels.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return canonicalPublicRoutes.map((route) => ({
    url: `${baseUrl}${route === "/" ? "" : route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : ["/platform", "/solutions", "/trust", "/enterprise", "/developers", "/pricing"].includes(route) ? 0.8 : 0.5,
  }));
}
