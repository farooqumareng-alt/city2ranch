import type { Metadata } from "next";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ServiceTiers } from "@/components/home/ServiceTiers";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Groceries, private shopping, essentials, hardware, pet supplies, packages, restaurant takeout and personal errands — delivered to your ranch or rural property.",
};

export default function ServicesPage() {
  return (
    <>
      <ServicesGrid />
      <ServiceTiers />
    </>
  );
}
