import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import {
  opinionAccessSessions,
  opinionAccessTokens,
  opinionContacts,
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

export type OpinionStatus = "OPEN" | "COMPLETED" | "DELETED";

export async function getOpinionForCitizen(opinionId: string) {
  const db = getDb();
  const [opinion] = await db
    .select()
    .from(opinions)
    .where(and(eq(opinions.id, opinionId), ne(opinions.status, "DELETED")))
    .limit(1);
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
      status: opinions.status,
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

export async function updateOpinionStatus(
  opinionId: string,
  status: Exclude<OpinionStatus, "DELETED">,
  principal: CouncilorPrincipal,
): Promise<{ id: string; status: OpinionStatus }> {
  if (!principal.permissions.includes("OPINION_MANAGE")) {
    throw new ApiError("OPINION_FORBIDDEN", 403, "You cannot manage this opinion.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: opinions.id, status: opinions.status })
      .from(opinions)
      .where(eq(opinions.id, opinionId))
      .limit(1);
    if (!current) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

    if (current.status === "DELETED") {
      throw new ApiError("OPINION_DELETED", 409, "Deleted opinions cannot be reopened.");
    }

    if (current.status !== status) {
      await tx.update(opinions).set({ status }).where(eq(opinions.id, opinionId));
      await tx.insert(opinionEvents).values({
        opinionId,
        type: status === "COMPLETED" ? "COMPLETED" : "REOPENED",
        actorType: principal.role,
        actorId: principal.accountId,
        payload: { eventType: status, opinionId, actorId: principal.accountId, status },
      });
    }

    return { id: current.id, status };
  });
}

export async function deleteOpinion(
  opinionId: string,
  principal: CouncilorPrincipal,
): Promise<{ id: string }> {
  if (!principal.permissions.includes("OPINION_MANAGE")) {
    throw new ApiError("OPINION_FORBIDDEN", 403, "You cannot manage this opinion.");
  }

  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: opinions.id })
      .from(opinions)
      .where(eq(opinions.id, opinionId))
      .limit(1);
    if (!existing) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");

    // Foreign keys are RESTRICT by design. Delete dependent records explicitly
    // in one transaction so a partial delete can never be committed.
    await tx.delete(opinionEvents).where(eq(opinionEvents.opinionId, opinionId));
    await tx.delete(opinionAccessSessions).where(eq(opinionAccessSessions.opinionId, opinionId));
    await tx.delete(opinionAccessTokens).where(eq(opinionAccessTokens.opinionId, opinionId));
    await tx.delete(opinionContacts).where(eq(opinionContacts.opinionId, opinionId));
    await tx.delete(opinionRecipients).where(eq(opinionRecipients.opinionId, opinionId));
    const [deleted] = await tx
      .delete(opinions)
      .where(eq(opinions.id, opinionId))
      .returning({ id: opinions.id });

    if (!deleted) throw new ApiError("OPINION_NOT_FOUND", 404, "Opinion was not found.");
    return deleted;
  });
}

function addViewProofStatus(
  opinionId: string,
  events: Array<{
    type: "SUBMITTED" | "DELIVERED" | "VIEWED" | "COMPLETED" | "DELETED" | "REOPENED";
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
