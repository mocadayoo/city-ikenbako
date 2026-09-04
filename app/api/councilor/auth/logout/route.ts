import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../../infrastructure/db/client";
import { councilorSessions } from "../../../../../infrastructure/db/schema";
import { hashOpaqueToken } from "../../../../../infrastructure/crypto/tokens";
import { COUNCILOR_SESSION_COOKIE } from "../../../../councilor/councilor-session";
import { assertSameOrigin } from "../../../../councilor/csrf";

export async function POST(request: Request) {
  assertSameOrigin(request);
  const rawToken = (await cookies()).get(COUNCILOR_SESSION_COOKIE)?.value;
  if (rawToken) {
    await getDb()
      .update(councilorSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(councilorSessions.tokenHash, hashOpaqueToken(rawToken)), isNull(councilorSessions.revokedAt)));
  }

  const response = NextResponse.json({ data: { loggedOut: true } });
  response.cookies.set(COUNCILOR_SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
