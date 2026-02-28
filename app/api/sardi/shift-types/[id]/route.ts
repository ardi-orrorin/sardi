import { NextRequest } from "next/server";

import { proxyRequest, readAuthToken, unauthorizedResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "invalid request" }, { status: 400 });
  }

  const { id } = await params;
  const path = `/api/v1/sardi/private/shift-types/${encodeURIComponent(id)}`;

  try {
    return await proxyRequest(req, "PATCH", path, token, body);
  } catch (error) {
    console.error("shift-types PATCH error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const path = `/api/v1/sardi/private/shift-types/${encodeURIComponent(id)}`;

  try {
    return await proxyRequest(req, "DELETE", path, token);
  } catch (error) {
    console.error("shift-types DELETE error:", error);
    return Response.json({ error: "request failed" }, { status: 500 });
  }
}
