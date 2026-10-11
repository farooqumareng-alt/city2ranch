import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICE_AREAS, getServiceArea } from "@/data/service-areas";
import { ServiceAreaTemplate } from "@/components/location/ServiceAreaTemplate";
import { pageSeo } from "@/lib/seo";

export async function generateStaticParams() {
  return SERVICE_AREAS.map((area) => ({ region: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const area = getServiceArea(region);
  if (!area) return { title: "Area Not Found" };
  const title = `Rural Concierge & Delivery in ${area.name}, ${area.state}`;
  const description = area.metaDescription;
  return {
    title,
    description,
    ...pageSeo({ path: `/service-area/${area.slug}`, title, description }),
  };
}

export default async function ServiceAreaRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const area = getServiceArea(region);
  if (!area) notFound();

  return <ServiceAreaTemplate area={area} />;
}
