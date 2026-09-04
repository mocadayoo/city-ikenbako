import { eq } from "drizzle-orm";
import { getDb } from "../../../infrastructure/db/client";
import { councilors } from "../../../infrastructure/db/schema";

export async function GET() {
  const rows = await getDb()
    .select({ id: councilors.id, name: councilors.name, district: councilors.district, organization: councilors.organization })
    .from(councilors)
    .where(eq(councilors.isActive, true));
  return Response.json({ data: rows });
}
