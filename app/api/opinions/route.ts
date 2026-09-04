import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../infrastructure/db/client";
import {
  opinionAccessTokens,
  opinionContacts,
  opinionEvents,
  opinionRecipients,
  opinions,
  councilors,
} from "../../../infrastructure/db/schema";
import { encryptEmail } from "../../../infrastructure/crypto/email";
import { createOpaqueToken, hashOpaqueToken } from "../../../infrastructure/crypto/tokens";
import { sendOpinionAccessMail } from "../../../infrastructure/mail/mock-mail";
import { toApiErrorResponse, ApiError } from "../../../shared/errors/api-error";

const schema = z.object({
  email: z.string().email().max(320),
  body: z.string().trim().min(1).max(20_000),
  recipientId: z.string().uuid(),
  title: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 64 * 1024) {
      throw new ApiError("PAYLOAD_TOO_LARGE", 413, "Payload is too large.");
    }
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new ApiError("INVALID_JSON", 400, "Request body must be valid JSON.");
    }
    const input = schema.parse(json);
    const db = getDb();
    const [recipient] = await db
      .select({ id: councilors.id })
      .from(councilors)
      .where(and(eq(councilors.id, input.recipientId), eq(councilors.isActive, true)))
      .limit(1);
    if (!recipient) throw new ApiError("RECIPIENT_NOT_FOUND", 404, "Recipient was not found.");

    const rawToken = createOpaqueToken(32);
    const tokenHash = hashOpaqueToken(rawToken);
    const result = await db.transaction(async (tx) => {
      const [opinion] = await tx
        .insert(opinions)
        .values({ title: input.title, body: input.body, category: input.category, region: input.region })
        .returning({ id: opinions.id, createdAt: opinions.createdAt });

      const [relation] = await tx
        .insert(opinionRecipients)
        .values({ opinionId: opinion.id, councilorId: input.recipientId })
        .returning({ id: opinionRecipients.id });

      await tx.insert(opinionContacts).values({ opinionId: opinion.id, emailEncrypted: encryptEmail(input.email) });
      await tx.insert(opinionAccessTokens).values({
        opinionId: opinion.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      });
      await tx.insert(opinionEvents).values([
        { opinionId: opinion.id, type: "SUBMITTED", actorType: "SYSTEM", payload: { eventType: "SUBMITTED" } },
        {
          opinionId: opinion.id,
          recipientId: relation.id,
          type: "DELIVERED",
          actorType: "SYSTEM",
          payload: { eventType: "DELIVERED", recipientId: relation.id },
        },
      ]);
      return opinion;
    });

    await sendOpinionAccessMail({ email: input.email, opinionId: result.id, rawToken });
    return Response.json({ data: { opinionId: result.id, submittedAt: result.createdAt } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Input is invalid." } },
        { status: 400 },
      );
    }
    return toApiErrorResponse(error);
  }
}
