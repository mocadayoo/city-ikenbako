import { getCouncilorPrincipal } from "../../../../councilor/councilor-session";
import { getOpinionForCouncilor } from "../../../../opinions/opinion-repository";
import { toApiErrorResponse } from "../../../../../shared/errors/api-error";

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
