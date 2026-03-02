import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return handleSardiProxy(req, "GET", "/api/v1/sardi/private/calendar-sync/export-links", {
    logLabel: "calendar-sync export-links GET"
  });
}
