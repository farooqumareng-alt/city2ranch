import { Hero } from "@/components/home/Hero";
import { ZipCheckSection } from "@/components/home/ZipCheckSection";
import { BrandStory } from "@/components/home/BrandStory";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ServiceTiers } from "@/components/home/ServiceTiers";
import { HowItWorksSteps } from "@/components/home/HowItWorksSteps";
import { WhyGrid } from "@/components/home/WhyGrid";
import { TestimonialPlaceholder } from "@/components/home/TestimonialPlaceholder";
import { FoundingCTA } from "@/components/home/FoundingCTA";
import { RouteExplainer } from "@/components/home/RouteExplainer";
import { EstateTeaser } from "@/components/home/EstateTeaser";

export default function Home() {
  return (
    <>
      <Hero />
      <ZipCheckSection />
      <BrandStory />
      <ServicesGrid />
      <ServiceTiers />
      <HowItWorksSteps />
      <WhyGrid />
      <TestimonialPlaceholder />
      <FoundingCTA />
      <RouteExplainer />
      <EstateTeaser />
    </>
  );
}
