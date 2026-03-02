import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleSardiProxy(req, "PATCH", `/api/v1/sardi/private/patterns/${encodeURIComponent(id)}`, {
    requireBody: true,
    logLabel: "patterns PATCH"
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleSardiProxy(req, "DELETE", `/api/v1/sardi/private/patterns/${encodeURIComponent(id)}`, {
    logLabel: "patterns DELETE"
  });
}
