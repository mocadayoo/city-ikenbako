import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../infrastructure/db/client";
import { councilorAccounts, councilorSessions } from "../../../../../infrastructure/db/schema";
import { createOpaqueToken, hashOpaqueToken } from "../../../../../infrastructure/crypto/tokens";
import { COUNCILOR_SESSION_COOKIE } from "../../../../councilor/councilor-session";
import { assertSameOrigin } from "../../../../councilor/csrf";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  assertSameOrigin(request);

  const [account] = await getDb()
    .select({ id: councilorAccounts.id, email: councilorAccounts.email })
    .from(councilorAccounts)
    .where(eq(councilorAccounts.isEnabled, true))
    .limit(1);
  if (!account) return Response.json({ error: { code: "DEV_ACCOUNT_NOT_FOUND", message: "Seed a dev account first." } }, { status: 503 });

  const rawSession = createOpaqueToken(32);
  await getDb().insert(councilorSessions).values({
    accountId: account.id,
    tokenHash: hashOpaqueToken(rawSession),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
  });
  console.info(`[mock-auth] councilor session issued for ${account.email}`);

  const response = NextResponse.json({ data: { loggedIn: true } });
  response.cookies.set(COUNCILOR_SESSION_COOKIE, rawSession, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
