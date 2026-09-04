import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  opinionEvents,
  opinionRecipients,
  opinions,
} from "../../infrastructure/db/schema";
import {
  createViewNonce,
  createViewProof,
  verifyViewProof,
  VIEW_PROOF_VERSION,
} from "../../infrastructure/crypto/tokens";
import { ApiError } from "../../shared/errors/api-error";
import type { CouncilorPrincipal } from "../councilor/councilor-session";

export async function getOpinionForCitizen(opinionId: string) {
  const db = getDb();
  const [opinion] = await db.select().from(opinions).where(eq(opinions.id, opinionId)).limit(1);
  if (!opinion) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

  const events = await db
    .select({
      type: opinionEvents.type,
      occurredAt: opinionEvents.occurredAt,
      actorId: opinionEvents.actorId,
      signature: opinionEvents.signature,
      proofVersion: opinionEvents.proofVersion,
    })
    .from(opinionEvents)
    .where(eq(opinionEvents.opinionId, opinionId))
    .orderBy(opinionEvents.occurredAt);

  return { ...opinion, events: addViewProofStatus(opinionId, events) };
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
    .select({
      type: opinionEvents.type,
      occurredAt: opinionEvents.occurredAt,
      actorId: opinionEvents.actorId,
      signature: opinionEvents.signature,
      proofVersion: opinionEvents.proofVersion,
    })
    .from(opinionEvents)
    .where(eq(opinionEvents.opinionId, opinionId))
    .orderBy(opinionEvents.occurredAt);

  return {
    ...opinion,
    events: addViewProofStatus(opinionId, events),
    viewNonce: createViewNonce(opinionId, principal.accountId),
  };
}

function addViewProofStatus(
  opinionId: string,
  events: Array<{
    type: "SUBMITTED" | "DELIVERED" | "VIEWED";
    occurredAt: Date;
    actorId: string | null;
    signature: string | null;
    proofVersion: number | null;
  }>,
) {
  return events.map((event) => ({
    type: event.type,
    occurredAt: event.occurredAt,
    proofVerified:
      event.type === "VIEWED" &&
      event.actorId !== null &&
      event.signature !== null &&
      verifyViewProof({
        opinionId,
        accountId: event.actorId,
        occurredAt: event.occurredAt,
        signature: event.signature,
        proofVersion: event.proofVersion,
      }),
  }));
}

export async function recordCouncilorView(
  opinionId: string,
  principal: CouncilorPrincipal,
): Promise<{ proofVersion: number; proofVerified: boolean; occurredAt: Date }> {
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

  const occurredAt = new Date();
  const signature = createViewProof(opinionId, principal.accountId, occurredAt);
  const [inserted] = await db
    .insert(opinionEvents)
    .values({
      opinionId,
      recipientId: recipient?.id,
      type: "VIEWED",
      actorType: principal.role,
      actorId: principal.accountId,
      occurredAt,
      signature,
      proofVersion: VIEW_PROOF_VERSION,
      payload: {
        eventType: "VIEWED",
        opinionId,
        actorId: principal.accountId,
        occurredAt: occurredAt.toISOString(),
        proofVersion: VIEW_PROOF_VERSION,
      },
    })
    .onConflictDoNothing()
    .returning({ signature: opinionEvents.signature, proofVersion: opinionEvents.proofVersion });

  if (inserted?.signature && inserted.proofVersion !== null) {
    return {
      proofVersion: inserted.proofVersion,
      proofVerified: verifyViewProof({
        opinionId,
        accountId: principal.accountId,
        occurredAt,
        signature: inserted.signature,
        proofVersion: inserted.proofVersion,
      }),
      occurredAt,
    };
  }

  const [existing] = await db
    .select({
      signature: opinionEvents.signature,
      proofVersion: opinionEvents.proofVersion,
      occurredAt: opinionEvents.occurredAt,
    })
    .from(opinionEvents)
    .where(
      and(
        eq(opinionEvents.opinionId, opinionId),
        eq(opinionEvents.type, "VIEWED"),
        eq(opinionEvents.actorId, principal.accountId),
      ),
    )
    .limit(1);

  const proofVerified = Boolean(
    existing?.signature &&
      verifyViewProof({
        opinionId,
        accountId: principal.accountId,
        occurredAt: existing.occurredAt,
        signature: existing.signature,
        proofVersion: existing.proofVersion,
      }),
  );
  return {
    proofVersion: existing?.proofVersion ?? VIEW_PROOF_VERSION,
    proofVerified,
    occurredAt: existing?.occurredAt ?? occurredAt,
  };
}
