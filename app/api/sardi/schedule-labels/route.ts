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

  try {
    return await proxyRequest(req, "GET", "/api/v1/sardi/private/schedule-labels", token);
  } catch (error) {
    console.error("schedule-labels GET error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    return await proxyRequest(req, "POST", "/api/v1/sardi/private/schedule-labels", token, body);
  } catch (error) {
    console.error("schedule-labels POST error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}
