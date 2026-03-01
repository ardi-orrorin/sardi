import { NextRequest } from "next/server";

import { proxyRequest, readAuthToken, unauthorizedResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const path = `/api/v1/sardi/private/schedule-groups/${encodeURIComponent(id)}`;

  try {
    return await proxyRequest(req, "GET", path, token);
  } catch (error) {
    console.error("schedule-group detail GET error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const path = `/api/v1/sardi/private/schedule-groups/${encodeURIComponent(id)}`;

  try {
    return await proxyRequest(req, "DELETE", path, token);
  } catch (error) {
    console.error("schedule-group DELETE error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}
