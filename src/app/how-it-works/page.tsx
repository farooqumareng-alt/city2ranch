import type { Metadata } from "next";
import { HowItWorksSteps } from "@/components/home/HowItWorksSteps";
import { RouteExplainer } from "@/components/home/RouteExplainer";
import { WhyGrid } from "@/components/home/WhyGrid";
import { pageSeo } from "@/lib/seo";

const TITLE = "How It Works";
const DESCRIPTION =
  "How City2Ranch's private rural concierge and delivery service works, from request to delivery.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageSeo({ path: "/how-it-works", title: TITLE, description: DESCRIPTION }),
};

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorksSteps titleLevel="h1" />
      <RouteExplainer />
      <WhyGrid />
    </>
  );
}
