import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignInForm } from "@/components/forms/SignInForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { defaultLandingFor } from "@/lib/auth/roles";

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
  //
  // Falls back to defaultLandingFor() (2026-09-08, Priority 2 of the
  // master implementation directive), not a hardcoded "/home" — this
  // used to disagree with what /auth/callback would have sent the same
  // identity to, landing a staff/driver identity on the customer
  // dashboard just because they revisited this page instead of clicking
  // a fresh magic link. One shared landing decision now, not two.
  const user = await getCurrentUser();
  if (user) {
    const hasExplicitNext = next && next.startsWith("/") && !next.startsWith("//");
    redirect(hasExplicitNext ? next : await defaultLandingFor(user.id));
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
