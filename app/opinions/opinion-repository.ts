import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  opinionEvents,
  opinionRecipients,
  opinions,
} from "../../infrastructure/db/schema";
import { createViewNonce } from "../../infrastructure/crypto/tokens";
import { ApiError } from "../../shared/errors/api-error";
import type { CouncilorPrincipal } from "../councilor/councilor-session";

export async function getOpinionForCitizen(opinionId: string) {
  const db = getDb();
  const [opinion] = await db.select().from(opinions).where(eq(opinions.id, opinionId)).limit(1);
  if (!opinion) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

  const events = await db
    .select({ type: opinionEvents.type, occurredAt: opinionEvents.occurredAt })
    .from(opinionEvents)
    .where(eq(opinionEvents.opinionId, opinionId))
    .orderBy(opinionEvents.occurredAt);

  return { ...opinion, events };
}

export async function listOpinionsForCouncilor() {
  return getDb()
    .select({
      id: opinions.id,
      title: opinions.title,
      body: opinions.body,
      category: opinions.category,
      region: opinions.region,
      createdAt: opinions.createdAt,
    })
    .from(opinions)
    .orderBy(desc(opinions.createdAt));
}

export async function getOpinionForCouncilor(opinionId: string, principal: CouncilorPrincipal) {
  if (!principal.permissions.includes("OPINION_READ_ALL")) {
    throw new ApiError("OPINION_FORBIDDEN", 403, "You cannot read this opinion.");
  }

  const db = getDb();
  const [opinion] = await db.select().from(opinions).where(eq(opinions.id, opinionId)).limit(1);
  if (!opinion) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

  const events = await db
    .select({ type: opinionEvents.type, occurredAt: opinionEvents.occurredAt })
    .from(opinionEvents)
    .where(eq(opinionEvents.opinionId, opinionId))
    .orderBy(opinionEvents.occurredAt);

  return {
    ...opinion,
    events,
    viewNonce: createViewNonce(opinionId, principal.accountId),
  };
}

export async function recordCouncilorView(
  opinionId: string,
  principal: CouncilorPrincipal,
): Promise<void> {
  if (!principal.permissions.includes("OPINION_READ_ALL")) {
    throw new ApiError("OPINION_FORBIDDEN", 403, "You cannot read this opinion.");
  }

  const db = getDb();
  const [opinion] = await db.select({ id: opinions.id }).from(opinions).where(eq(opinions.id, opinionId));
  if (!opinion) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

  const [recipient] = await db
    .select({ id: opinionRecipients.id })
    .from(opinionRecipients)
    .where(and(eq(opinionRecipients.opinionId, opinionId), eq(opinionRecipients.councilorId, principal.councilorId)))
    .limit(1);

  await db
    .insert(opinionEvents)
    .values({
      opinionId,
      recipientId: recipient?.id,
      type: "VIEWED",
      actorType: principal.role,
      actorId: principal.accountId,
      payload: { eventType: "VIEWED", opinionId, actorId: principal.accountId },
    })
    .onConflictDoNothing();
}
