import { FetchBuilder } from "@/app/_commons/utils/func";
import { NextRequest, NextResponse } from "next/server";

import { makeBackendUrl, readAuthToken, resolvePublicBaseUrl, unauthorizedResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CalendarExportLinkPayload = {
  token?: string;
  [key: string]: unknown;
};

type CalendarExportListPayload = {
  items?: CalendarExportLinkPayload[];
  [key: string]: unknown;
};

function withProxyUrls(item: CalendarExportLinkPayload, publicBaseUrl: string): CalendarExportLinkPayload {
  const token = typeof item.token === "string" ? item.token.trim() : "";
  if (!token) {
    return item;
  }

  const encoded = encodeURIComponent(token);
  return {
    ...item,
    ics_url: `${publicBaseUrl}/api/v1/sardi/public/ics/${encoded}`,
    caldav_url: `${publicBaseUrl}/api/v1/sardi/public/caldav/${encoded}/calendar`
  };
}

export async function GET(req: NextRequest) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const origin = req.headers.get("origin");
    const response = await FetchBuilder.get()
      .url(makeBackendUrl("/api/v1/sardi/private/calendar-sync/export-links"))
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as CalendarExportListPayload;
    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    const publicBaseUrl = resolvePublicBaseUrl(req);
    const items = Array.isArray(payload.items) ? payload.items.map((item) => withProxyUrls(item, publicBaseUrl)) : [];
    return NextResponse.json({ ...payload, items }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
