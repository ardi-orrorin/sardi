import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleSardiProxy(
    req,
    "POST",
    `/api/v1/sardi/private/employees/${encodeURIComponent(id)}/schedule-overrides`,
    {
      requireBody: true,
      logLabel: "employee schedule-overrides POST"
    }
  );
}
