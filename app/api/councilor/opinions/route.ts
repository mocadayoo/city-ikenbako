import { getCouncilorPrincipal } from "../../../councilor/councilor-session";
import { listOpinionsForCouncilor } from "../../../opinions/opinion-repository";
import { toApiErrorResponse } from "../../../../shared/errors/api-error";

export async function GET() {
  try {
    const principal = await getCouncilorPrincipal();
    if (!principal.permissions.includes("OPINION_READ_ALL")) {
      return Response.json({ error: { code: "OPINION_FORBIDDEN", message: "Forbidden." } }, { status: 403 });
    }
    return Response.json({ data: await listOpinionsForCouncilor() });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
