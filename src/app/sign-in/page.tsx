import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignInForm } from "@/components/forms/SignInForm";
import { getCurrentUser } from "@/lib/supabase/server";

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

  // A visitor who's already signed in (e.g. a stale bookmark, the back
  // button, or a shared link) previously still saw this form — while
  // NavAuthControl's header, which reads the real client-side session,
  // correctly showed them as signed in the whole time. Harmless to
  // resubmit, but confusing. Same next-param destination the magic-link
  // callback itself uses, and the same allowlist rule (only a same-origin
  // relative path).
  const user = await getCurrentUser();
  if (user) {
    redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/home");
  }

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
