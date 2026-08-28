import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOwnPlaces, deletePlace, setDefaultPlace } from "@/lib/actions/places";
import { getEffectiveOwnerId } from "@/lib/household";
import { DROPOFF_LOCATION_OPTIONS } from "@/lib/constants";

const DROPOFF_LABELS = Object.fromEntries(DROPOFF_LOCATION_OPTIONS.map((o) => [o.value, o.label]));

export const metadata: Metadata = {
  title: "My Places",
  description: "Your saved properties — ranch, lake house, guest house — for faster requests.",
};

export default async function PlacesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const ownerId = await getEffectiveOwnerId(user.id);

  const places = await getOwnPlaces(ownerId);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="YOUR ACCOUNT"
          title="My Places"
          description="Save your properties once, then pick from them when you place a request."
        />
        <Button href="/places/new" variant="navy">
          Add a Place
        </Button>
      </div>

      {places.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          You haven&apos;t saved any places yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {places.map((place) => (
            <div
              key={place.id}
              className="flex flex-col gap-3 rounded-sm border border-navy/10 bg-white/60 p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-lg text-navy-deep">{place.label}</p>
                  {place.isDefault ? (
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-gold">
                      Default
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="font-sans text-sm text-charcoal/70">
                {place.addressLine1}
                {place.addressLine2 ? `, ${place.addressLine2}` : ""}
                <br />
                {place.city}, {place.state} {place.zip}
              </p>
              {place.gateCode || place.dropoffLocation || place.accessNotes ? (
                <div className="flex flex-col gap-0.5 font-sans text-xs text-charcoal/60">
                  {place.gateCode ? <p>Gate code: {place.gateCode}</p> : null}
                  {place.dropoffLocation ? (
                    <p>Drop-off: {DROPOFF_LABELS[place.dropoffLocation] ?? place.dropoffLocation}</p>
                  ) : null}
                  {place.accessNotes ? <p>{place.accessNotes}</p> : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3 border-t border-navy/10 pt-3">
                <Button href={`/places/${place.id}`} variant="outline-dark" size="md">
                  Edit
                </Button>
                {!place.isDefault ? (
                  <form action={setDefaultPlace.bind(null, place.id)}>
                    <Button type="submit" variant="outline-dark" size="md">
                      Set as default
                    </Button>
                  </form>
                ) : null}
                <form action={deletePlace.bind(null, place.id)}>
                  <Button type="submit" variant="outline-dark" size="md">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
