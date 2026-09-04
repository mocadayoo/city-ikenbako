import { requireOpinionAccess } from "../../../opinions/citizen-session";
import { getOpinionForCitizen } from "../../../opinions/opinion-repository";
import { toApiErrorResponse } from "../../../../shared/errors/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ opinionId: string }> },
) {
  try {
    const { opinionId } = await context.params;
    await requireOpinionAccess(opinionId);
    return Response.json({ data: await getOpinionForCitizen(opinionId) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
