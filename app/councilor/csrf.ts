import { ApiError } from "../../shared/errors/api-error";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError("CSRF_REJECTED", 403, "Request origin is not allowed.");
  }
}
