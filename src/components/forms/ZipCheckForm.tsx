"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { WaitlistForm } from "@/components/forms/WaitlistForm";

type Result = { zip: string; available: boolean } | null;

export function ZipCheckForm() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid 5-digit ZIP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/zip-check?zip=${encodeURIComponent(zip)}`);
      if (!res.ok) {
        throw new Error("lookup failed");
      }
      const data = await res.json();
      setResult({ zip: data.zip, available: data.available });
    } catch {
      setError(
        "We couldn't check that ZIP code right now. Please try again shortly."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="zip-check"
            className="mb-1.5 block font-sans text-sm font-medium text-navy-deep"
          >
            ZIP Code
          </label>
          <input
            id="zip-check"
            name="zip"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            placeholder="76024"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "zip-check-error" : undefined}
            className="w-full rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold"
          />
        </div>
        <Button type="submit" variant="navy" disabled={loading}>
          {loading ? "Checking…" : "Check Availability"}
        </Button>
      </form>

      {error ? (
        <p id="zip-check-error" role="alert" className="font-sans text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {result ? (
        result.available ? (
          <div className="rounded-sm border border-gold/40 bg-gold/10 p-6">
            <p className="font-serif text-lg text-navy-deep">
              Service Available
            </p>
            <p className="mt-2 font-sans text-sm text-charcoal/70">
              Your area is currently within a City2Ranch service route.
            </p>
            <Button href="/request-service" variant="gold" className="mt-4">
              Request Service
            </Button>
          </div>
        ) : (
          <div className="rounded-sm border border-navy/15 bg-white/70 p-6">
            <p className="font-serif text-lg text-navy-deep">Coming Soon</p>
            <p className="mt-2 font-sans text-sm text-charcoal/70">
              We don&apos;t currently have a route serving your area, but
              we&apos;re building service in your region.
            </p>
            <div className="mt-6">
              <WaitlistForm zip={result.zip} />
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
