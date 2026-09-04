import { NextRequest, NextResponse } from "next/server";

const sessionCookie = "councilor_session";

export function councilorProxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/councilor/login" || pathname === "/api/councilor/auth/dev-login";
  const hasSession = Boolean(request.cookies.get(sessionCookie)?.value);

  if (!isLogin && !hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "COUNCILOR_UNAUTHENTICATED", message: "Authentication required." } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/councilor/login", request.url));
  }

  return NextResponse.next();
}
