import { NextRequest } from "next/server";

import { handleSardiProxy } from "../../../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  return handleSardiProxy(
    req,
    "PATCH",
    `/api/v1/sardi/private/employees/${encodeURIComponent(id)}/pattern-assignments/${encodeURIComponent(assignmentId)}`,
    {
      requireBody: true,
      logLabel: "employee pattern-assignments PATCH"
    }
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  return handleSardiProxy(
    req,
    "DELETE",
    `/api/v1/sardi/private/employees/${encodeURIComponent(id)}/pattern-assignments/${encodeURIComponent(assignmentId)}`,
    {
      logLabel: "employee pattern-assignments DELETE"
    }
  );
}
