import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SecurityResourceArticle } from "@/components/search/security-resource";
import { publicSocialMetadata } from "@/lib/search/metadata";
import { RESOURCE_ROOT, securityResources } from "@/lib/search/resources";

export const dynamicParams = false;
export function generateStaticParams() { return securityResources.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resource = securityResources.find((item) => item.slug === slug);
  if (!resource) notFound();
  const path = `${RESOURCE_ROOT}/${resource.slug}`;
  const title = `${resource.title} | Cyber Sentinels`;
  return { title, description: resource.description, alternates: { canonical: path }, ...publicSocialMetadata(title, resource.description, path) };
}
export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = securityResources.find((item) => item.slug === slug);
  if (!resource) notFound();
  return <SecurityResourceArticle resource={resource} />;
}
