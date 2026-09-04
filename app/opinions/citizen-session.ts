import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import { opinionAccessSessions } from "../../infrastructure/db/schema";
import { hashOpaqueToken } from "../../infrastructure/crypto/tokens";
import { ApiError } from "../../shared/errors/api-error";

export const OPINION_ACCESS_SESSION_COOKIE = "opinion_access_session";

export async function requireOpinionAccess(opinionId: string): Promise<void> {
  const rawToken = (await cookies()).get(OPINION_ACCESS_SESSION_COOKIE)?.value;
  if (!rawToken) throw new ApiError("OPINION_UNAUTHENTICATED", 404, "Opinion was not found.");

  const tokenHash = hashOpaqueToken(rawToken);
  const [session] = await getDb()
    .select({ opinionId: opinionAccessSessions.opinionId })
    .from(opinionAccessSessions)
    .where(
      and(
        eq(opinionAccessSessions.tokenHash, tokenHash),
        eq(opinionAccessSessions.opinionId, opinionId),
        gt(opinionAccessSessions.expiresAt, new Date()),
        isNull(opinionAccessSessions.revokedAt),
      ),
    )
    .limit(1);

  if (!session) throw new ApiError("OPINION_UNAUTHENTICATED", 404, "Opinion was not found.");

  await getDb()
    .update(opinionAccessSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(opinionAccessSessions.tokenHash, tokenHash));
}
