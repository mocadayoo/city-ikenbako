import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../infrastructure/db/client";
import { councilorAccounts, councilorSessions, councilors } from "../../infrastructure/db/schema";
import { hashOpaqueToken } from "../../infrastructure/crypto/tokens";
import { ApiError } from "../../shared/errors/api-error";

export const COUNCILOR_SESSION_COOKIE = "councilor_session";

export type CouncilorPrincipal = {
  accountId: string;
  councilorId: string;
  name: string;
  organization: string;
  role: "COUNCILOR" | "STAFF";
  permissions: ["OPINION_READ_ALL"];
};

export async function getCouncilorPrincipal(): Promise<CouncilorPrincipal> {
  const rawToken = (await cookies()).get(COUNCILOR_SESSION_COOKIE)?.value;
  if (!rawToken) throw new ApiError("COUNCILOR_UNAUTHENTICATED", 401, "Authentication required.");

  const [row] = await getDb()
    .select({
      accountId: councilorAccounts.id,
      councilorId: councilors.id,
      name: councilors.name,
      organization: councilors.organization,
      role: councilorAccounts.role,
    })
    .from(councilorSessions)
    .innerJoin(councilorAccounts, eq(councilorSessions.accountId, councilorAccounts.id))
    .innerJoin(councilors, eq(councilorAccounts.councilorId, councilors.id))
    .where(
      and(
        eq(councilorSessions.tokenHash, hashOpaqueToken(rawToken)),
        gt(councilorSessions.expiresAt, new Date()),
        isNull(councilorSessions.revokedAt),
        eq(councilorAccounts.isEnabled, true),
        eq(councilors.isActive, true),
      ),
    )
    .limit(1);

  if (!row) throw new ApiError("COUNCILOR_UNAUTHENTICATED", 401, "Authentication required.");

  await getDb()
    .update(councilorSessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(councilorSessions.tokenHash, hashOpaqueToken(rawToken)));

  return { ...row, permissions: ["OPINION_READ_ALL"] };
}

export async function assertCouncilorCanReadAll(): Promise<CouncilorPrincipal> {
  const principal = await getCouncilorPrincipal();
  if (!principal.permissions.includes("OPINION_READ_ALL")) {
    throw new ApiError("OPINION_FORBIDDEN", 403, "You cannot read this opinion.");
  }
  return principal;
}
