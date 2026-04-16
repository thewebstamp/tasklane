import { execute } from "@/lib/db";

export async function trackEvent(
  userId: string | null,
  eventType: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await execute(
    `INSERT INTO analytics_events (user_id, event_type, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      eventType,
      entityType ?? null,
      entityId ?? null,
      JSON.stringify(metadata ?? {}),
    ],
  );
}
