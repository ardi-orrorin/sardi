import { NextRequest } from "next/server";

import { proxyRequest, readAuthToken, unauthorizedResponse } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const limit = req.nextUrl.searchParams.get("limit") ?? "30";
  const offset = req.nextUrl.searchParams.get("offset") ?? "0";
  const qs = new URLSearchParams({ limit, offset }).toString();

  try {
    return await proxyRequest(req, "GET", `/api/v1/sardi/private/schedule-groups?${qs}`, token);
  } catch (error) {
    console.error("schedule-groups GET error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}
