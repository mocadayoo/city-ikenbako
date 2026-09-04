import { getCouncilorPrincipal } from "../../../councilor/councilor-session";
import { toApiErrorResponse } from "../../../../shared/errors/api-error";

export async function GET() {
  try {
    return Response.json({ data: await getCouncilorPrincipal() });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
