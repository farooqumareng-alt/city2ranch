import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignInForm } from "@/components/forms/SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your City2Ranch account.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-24">
      <SectionHeading
        eyebrow="YOUR ACCOUNT"
        title="Sign In"
        description="Enter your email and we'll send you a private link to sign in — no password to remember."
      />
      <div className="max-w-md">
        <SignInForm next={next} />
      </div>
    </Container>
  );
}
