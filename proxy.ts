import { NextRequest, NextResponse } from "next/server";
import { councilorProxy } from "./app/councilor/councilor-proxy";

export function proxy(request: NextRequest): NextResponse {
  const response = request.nextUrl.pathname.startsWith("/councilor") ||
    request.nextUrl.pathname.startsWith("/api/councilor")
    ? councilorProxy(request)
    : NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/councilor/:path*", "/api/councilor/:path*"],
};
