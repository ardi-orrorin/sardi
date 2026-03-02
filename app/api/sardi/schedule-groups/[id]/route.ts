import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleSardiProxy(req, "GET", `/api/v1/sardi/private/schedule-groups/${encodeURIComponent(id)}`, {
    logLabel: "schedule-group detail GET"
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleSardiProxy(req, "DELETE", `/api/v1/sardi/private/schedule-groups/${encodeURIComponent(id)}`, {
    logLabel: "schedule-group DELETE"
  });
}
