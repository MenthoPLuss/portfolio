import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Site } from "@/components/Site";
import { getProject, projects } from "@/content/portfolio";

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProject(slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.metaDescription,
    alternates: { canonical: `/work/${p.slug}` },
    openGraph: { title: `${p.title} · Asimangkan Boro`, description: p.metaDescription, type: "article" },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getProject(slug)) notFound();
  return <Site initialCase={slug} />;
}
