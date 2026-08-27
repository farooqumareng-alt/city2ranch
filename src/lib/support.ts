import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";

/**
 * A signed-in customer's own past /contact submissions — same pattern as
 * getOwnServiceRequests: real, pre-existing data (contact_messages) that
 * was previously write-only from the customer's side. Matched by email;
 * contact_messages has no auth_user_id column, so this is "here's what
 * you told us," not an ownership boundary.
 */
export async function getOwnSupportMessages(email: string) {
  const db = getDb();
  return db
    .select()
    .from(contactMessages)
    .where(sql`lower(${contactMessages.email}) = lower(${email})`)
    .orderBy(desc(contactMessages.createdAt));
}
