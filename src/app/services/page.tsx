import type { Metadata } from "next";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ServiceTiers } from "@/components/home/ServiceTiers";
import { pageSeo } from "@/lib/seo";

const TITLE = "Services";
const DESCRIPTION =
  "Groceries, private shopping, essentials, hardware, pet supplies, packages, restaurant takeout and personal errands — delivered to your ranch or rural property.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageSeo({ path: "/services", title: TITLE, description: DESCRIPTION }),
};

export default function ServicesPage() {
  return (
    <>
      <ServicesGrid titleLevel="h1" />
      <ServiceTiers />
    </>
  );
}
