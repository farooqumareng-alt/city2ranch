"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function SignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (signInError) {
      // Swallowed before this fix — logged so the real Supabase error
      // (e.g. rate limiting) is visible in DevTools instead of only ever
      // showing the generic fallback message below.
      console.error("[sign-in] signInWithOtp failed:", signInError);
      setStatus("error");
      setError(
        signInError.status === 429
          ? "You've requested a few sign-in links in a row — please wait a few minutes before trying again."
          : "We couldn't send a sign-in link right now. Please try again shortly."
      );
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
        <p className="font-serif text-lg text-navy-deep">Check your email.</p>
        <p className="mt-2 font-sans text-sm text-charcoal/70">
          We&apos;ve sent a private sign-in link to {email}. Click it to
          access your City2Ranch account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="font-sans text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div>
        <label
          htmlFor="sign-in-email"
          className="mb-1.5 block font-sans text-sm font-medium text-navy-deep"
        >
          Email
        </label>
        <input
          id="sign-in-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold"
        />
      </div>
      <Button type="submit" variant="navy" disabled={status === "loading"} className="self-start">
        {status === "loading" ? "Sending…" : "Send Sign-In Link"}
      </Button>
    </form>
  );
}
