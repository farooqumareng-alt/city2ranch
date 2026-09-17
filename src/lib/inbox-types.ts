/**
 * Split out of src/lib/actions/inbox.ts — that file is a "use server"
 * action boundary, which can only export async functions; SOURCE_LABELS
 * is a plain object, not a function, so it has to live somewhere else.
 * Same DB-free-module reasoning as work-queue-types.ts.
 */
export type InboxSource = "waitlist" | "founding_member" | "contact";

export type InboxEntry = {
  id: string;
  source: InboxSource;
  createdAt: Date;
  name: string;
  email: string;
  phone: string | null;
  /** A one-line summary of what makes this entry distinct — the ZIP/
   *  frequency for a waitlist signup, the property location for a
   *  founding-member application, the subject line for a contact
   *  message. */
  context: string;
  /** Free-text body, when there is one (a contact message's own text) —
   *  null for the two structured signup forms, which have no single
   *  "message" field to show. */
  message: string | null;
  status: "new" | "contacted" | "converted" | "closed";
};

export const SOURCE_LABELS: Record<InboxSource, string> = {
  waitlist: "Service Area Waitlist",
  founding_member: "Founding Member",
  contact: "Contact / Support",
};
