import { Button } from "@/components/ui/Button";

/** Generalizes the plain `<p className="font-sans text-sm
 *  text-charcoal/70">...</p>` empty-list message repeated 10+ times
 *  across the app (My Requests, My Orders, the dispatch queue, the
 *  admin staff/driver lists, etc.) — same className, so adopting this
 *  anywhere existing is a zero-visual-diff swap, not a redesign. */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <p className="font-sans text-sm text-charcoal/70">{message}</p>
      {action ? (
        <Button href={action.href} variant="outline-dark" size="md">
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
