import type { Metadata } from "next";
import { HowItWorksSteps } from "@/components/home/HowItWorksSteps";
import { RouteExplainer } from "@/components/home/RouteExplainer";
import { WhyGrid } from "@/components/home/WhyGrid";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "How City2Ranch's private rural concierge and delivery service works, from request to delivery.",
};

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorksSteps />
      <RouteExplainer />
      <WhyGrid />
    </>
  );
}
