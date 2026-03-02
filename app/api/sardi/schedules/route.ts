import { NextRequest, NextResponse } from "next/server";

import { handleSardiProxy } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!start || !end) {
    return NextResponse.json({ error: "start/end query required" }, { status: 400 });
  }

  const query = new URLSearchParams({ start, end });
  if (q) {
    query.set("q", q);
  }

  const qs = query.toString();
  return handleSardiProxy(req, "GET", `/api/v1/sardi/private/schedules?${qs}`, {
    logLabel: "schedules GET"
  });
}

export async function POST(req: NextRequest) {
  return handleSardiProxy(req, "POST", "/api/v1/sardi/private/schedules", {
    requireBody: true,
    logLabel: "schedules POST"
  });
}
