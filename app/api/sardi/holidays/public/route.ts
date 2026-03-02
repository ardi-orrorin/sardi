import { NextRequest, NextResponse } from "next/server";

import { handleSardiProxy } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");
  if (!year || !month) {
    return NextResponse.json({ error: "year/month query required" }, { status: 400 });
  }

  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return NextResponse.json({ error: "invalid year/month query" }, { status: 400 });
  }

  const qs = new URLSearchParams({
    year: String(parsedYear),
    month: String(parsedMonth).padStart(2, "0")
  }).toString();

  return handleSardiProxy(req, "GET", `/api/v1/sardi/private/holidays/public?${qs}`, {
    logLabel: "public holidays GET"
  });
}
