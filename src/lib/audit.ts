import { auditEvents } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

type AuditActorType = "customer" | "staff" | "driver" | "system";

type LogAuditEventInput = {
  orderId: string;
  actorType: AuditActorType;
  /** The acting person's auth.users id — always this, never a
   *  staff/drivers table row id, so this table never needs to know
   *  which role table to join. Omit/null for actorType "system". */
  actorId?: string | null;
  action: string;
  previousState?: string | null;
  newState?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * One reusable insert every state-changing order action calls — exactly
 * once per real transition, not once per synthetic sub-step. Takes an
 * optional `db` param so callers already inside a transaction can pass
 * it through instead of opening a second connection.
 */
export async function logAuditEvent(
  input: LogAuditEventInput,
  db: ReturnType<typeof getDb> = getDb()
): Promise<void> {
  await db.insert(auditEvents).values({
    orderId: input.orderId,
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    action: input.action,
    previousState: input.previousState ?? null,
    newState: input.newState ?? null,
    metadata: input.metadata ?? null,
  });
}
