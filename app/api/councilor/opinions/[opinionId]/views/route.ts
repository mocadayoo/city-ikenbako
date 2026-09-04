import { getCouncilorPrincipal } from "../../../../../councilor/councilor-session";
import { assertSameOrigin } from "../../../../../councilor/csrf";
import { recordCouncilorView } from "../../../../../opinions/opinion-repository";
import { verifyViewNonce } from "../../../../../../infrastructure/crypto/tokens";
import { toApiErrorResponse, ApiError } from "../../../../../../shared/errors/api-error";

export async function POST(
  request: Request,
  context: { params: Promise<{ opinionId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { opinionId } = await context.params;
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 8 * 1024) {
      throw new ApiError("PAYLOAD_TOO_LARGE", 413, "Payload is too large.");
    }
    let input: { viewNonce?: unknown };
    try {
      input = JSON.parse(rawBody) as { viewNonce?: unknown };
    } catch {
      throw new ApiError("INVALID_JSON", 400, "Request body must be valid JSON.");
    }
    if (typeof input.viewNonce !== "string") {
      throw new ApiError("VIEW_NONCE_REQUIRED", 400, "View nonce is required.");
    }

    const principal = await getCouncilorPrincipal();
    if (!verifyViewNonce(input.viewNonce, opinionId, principal.accountId)) {
      throw new ApiError("VIEW_NONCE_INVALID", 403, "View nonce is invalid or expired.");
    }

    const proof = await recordCouncilorView(opinionId, principal);
    return Response.json({
      data: {
        viewed: true,
        proofVersion: proof.proofVersion,
        proofVerified: proof.proofVerified,
        viewedAt: proof.occurredAt,
      },
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
