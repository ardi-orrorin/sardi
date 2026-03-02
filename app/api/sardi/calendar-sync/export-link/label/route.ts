import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest) {
  return handleSardiProxy(req, "PATCH", "/api/v1/sardi/private/calendar-sync/export-link/label", {
    requireBody: true,
    logLabel: "calendar-sync export-link label PATCH"
  });
}
