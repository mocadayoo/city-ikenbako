import { z } from "zod";
import { getCouncilorPrincipal } from "../../../../councilor/councilor-session";
import { assertSameOrigin } from "../../../../councilor/csrf";
import { deleteOpinion, getOpinionForCouncilor, updateOpinionStatus } from "../../../../opinions/opinion-repository";
import { toApiErrorResponse, ApiError } from "../../../../../shared/errors/api-error";

const statusAction = z.object({ action: z.enum(["COMPLETE", "REOPEN", "DELETE"]) }).strict();

export async function GET(
  _request: Request,
  context: { params: Promise<{ opinionId: string }> },
) {
  try {
    const { opinionId } = await context.params;
    return Response.json({ data: await getOpinionForCouncilor(opinionId, await getCouncilorPrincipal()) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PATCH(
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

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      throw new ApiError("INVALID_JSON", 400, "Request body must be valid JSON.");
    }

    const input = statusAction.safeParse(json);
    if (!input.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "A valid status action is required.");
    }

    const principal = await getCouncilorPrincipal();
    if (input.data.action === "DELETE") {
      const deleted = await deleteOpinion(opinionId, principal);
      return Response.json({ data: { ...deleted, deleted: true } });
    }

    const status = input.data.action === "COMPLETE" ? "COMPLETED" : "OPEN";
    const updated = await updateOpinionStatus(opinionId, status, principal);
    return Response.json({ data: updated });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
