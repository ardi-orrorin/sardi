import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const exportId = params.id?.trim();
  if (!exportId) {
    return new Response(JSON.stringify({ error: "invalid export id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  return handleSardiProxy(
    req,
    "DELETE",
    `/api/v1/sardi/private/calendar-sync/export-link/${encodeURIComponent(exportId)}`,
    {
      logLabel: "calendar-sync export-link DELETE"
    }
  );
}
