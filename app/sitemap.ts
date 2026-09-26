import type { MetadataRoute } from "next";
import { canonicalPublicRoutes } from "@/lib/navigation/route-visibility";

const baseUrl = "https://www.cybersentinels.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return canonicalPublicRoutes.map((route) => ({
    url: `${baseUrl}${route === "/" ? "" : route}`,
    // Unknown editorial dates are omitted rather than replaced with build time.
    ...(route.startsWith("/resources/agent-security") ? { lastModified: "2026-09-25" } : {}),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : ["/platform", "/solutions", "/trust", "/enterprise", "/developers", "/pricing", "/documents/operational-trust-whitepaper"].includes(route) ? 0.8 : 0.5,
  }));
}
