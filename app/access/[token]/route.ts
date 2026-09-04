import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../../../infrastructure/db/client";
import { opinionAccessSessions, opinionAccessTokens } from "../../../infrastructure/db/schema";
import { createOpaqueToken, hashOpaqueToken } from "../../../infrastructure/crypto/tokens";
import { OPINION_ACCESS_SESSION_COOKIE } from "../../opinions/citizen-session";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const tokenHash = hashOpaqueToken(token);
  const db = getDb();
  const [access] = await db
    .select({ opinionId: opinionAccessTokens.opinionId })
    .from(opinionAccessTokens)
    .where(
      and(
        eq(opinionAccessTokens.tokenHash, tokenHash),
        gt(opinionAccessTokens.expiresAt, new Date()),
        isNull(opinionAccessTokens.revokedAt),
      ),
    )
    .limit(1);

  if (!access) return new NextResponse("Access link is invalid or expired.", { status: 404 });

  const rawSession = createOpaqueToken(32);
  await db.insert(opinionAccessSessions).values({
    opinionId: access.opinionId,
    tokenHash: hashOpaqueToken(rawSession),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  });

  const response = NextResponse.redirect(new URL(`/opinions/view?id=${access.opinionId}`, new URL(_request.url).origin));
  response.cookies.set(OPINION_ACCESS_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
