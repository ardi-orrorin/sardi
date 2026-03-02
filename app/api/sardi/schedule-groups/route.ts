import { NextRequest } from "next/server";

import { handleSardiProxy } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "30";
  const offset = req.nextUrl.searchParams.get("offset") ?? "0";
  const qs = new URLSearchParams({ limit, offset }).toString();

  return handleSardiProxy(req, "GET", `/api/v1/sardi/private/schedule-groups?${qs}`, {
    logLabel: "schedule-groups GET"
  });
}
