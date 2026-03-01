import { NextRequest } from "next/server";

import { proxyRequest, readAuthToken, unauthorizedResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");
  if (!year || !month) {
    return Response.json({ error: "year/month query required" }, { status: 400 });
  }

  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    return Response.json({ error: "invalid year/month query" }, { status: 400 });
  }

  const qs = new URLSearchParams({
    year: String(parsedYear),
    month: String(parsedMonth).padStart(2, "0")
  }).toString();

  try {
    return await proxyRequest(req, "GET", `/api/v1/sardi/private/holidays/public?${qs}`, token);
  } catch (error) {
    console.error("public holidays GET error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}
