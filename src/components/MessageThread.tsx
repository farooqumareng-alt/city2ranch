import { Button } from "@/components/ui/Button";

type Message = {
  id: string;
  createdAt: Date;
  authorType: string;
  body: string;
};

/**
 * Generic list+form thread, extracted 2026-09-24 (panel redesign
 * round 2) from what used to be OrderMessageThread's own JSX so
 * order threads and the new driver threads (DriverMessageThread.tsx)
 * share one implementation instead of two copies that can drift.
 * Plain <form> + bound action, no client state needed (a full-page
 * revalidate on send is fine for a low-frequency thread, not live chat).
 */
export function MessageThread({
  messages,
  viewerRole,
  labelForAuthorType,
  postAction,
}: {
  messages: Message[];
  viewerRole: string;
  /** How to label a message from someone other than the viewer. */
  labelForAuthorType: (authorType: string) => string;
  postAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-serif text-lg text-navy-deep">Messages</h3>
      {messages.length === 0 ? (
        <p className="font-sans text-sm text-charcoal/70">
          No messages yet — send one if you need anything.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => {
            const isMe = message.authorType === viewerRole;
            return (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-sm border p-3 ${
                  isMe ? "self-end border-navy/10 bg-white/60" : "self-start border-gold/40 bg-gold/10"
                }`}
              >
                <p className="font-sans text-xs font-medium text-charcoal/50">
                  {isMe ? "You" : labelForAuthorType(message.authorType)} ·{" "}
                  {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-charcoal/80">{message.body}</p>
              </div>
            );
          })}
        </div>
      )}
      <form action={postAction} className="flex flex-col gap-2 sm:flex-row">
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Send a message…"
          className="w-full flex-1 rounded-sm border border-navy/20 bg-white px-4 py-2.5 font-sans text-sm text-charcoal placeholder:text-charcoal/40 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-1"
        />
        <Button type="submit" variant="navy" className="self-start">
          Send
        </Button>
      </form>
    </div>
  );
}
