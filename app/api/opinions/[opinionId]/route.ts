import { getCouncilorPrincipal } from "../../../councilor/councilor-session";
import { requireOpinionAccess } from "../../../opinions/citizen-session";
import { getOpinionForCitizen, getOpinionForCouncilor } from "../../../opinions/opinion-repository";
import { toApiErrorResponse } from "../../../../shared/errors/api-error";
import { cookies } from "next/headers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ opinionId: string }> },
) {
  try {
    const { opinionId } = await context.params;
    const hasCouncilorCookie = Boolean((await cookies()).get("councilor_session")?.value);

    if (hasCouncilorCookie) {
      return Response.json({ data: await getOpinionForCouncilor(opinionId, await getCouncilorPrincipal()) });
    }

    await requireOpinionAccess(opinionId);
    return Response.json({ data: await getOpinionForCitizen(opinionId) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
