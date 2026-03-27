import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; overrideId: string }> }
) {
  const { id, overrideId } = await params;
  return handleSardiProxy(
    req,
    "PATCH",
    `/api/v1/sardi/private/employees/${encodeURIComponent(id)}/schedule-overrides/${encodeURIComponent(overrideId)}`,
    {
      requireBody: true,
      logLabel: "employee schedule-overrides PATCH"
    }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; overrideId: string }> }
) {
  const { id, overrideId } = await params;
  return handleSardiProxy(
    req,
    "DELETE",
    `/api/v1/sardi/private/employees/${encodeURIComponent(id)}/schedule-overrides/${encodeURIComponent(overrideId)}`,
    {
      logLabel: "employee schedule-overrides DELETE"
    }
  );
}
