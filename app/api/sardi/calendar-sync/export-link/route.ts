import { FetchBuilder } from "@/app/_commons/utils/func";
import { NextRequest, NextResponse } from "next/server";

import { makeBackendUrl, readAuthToken, readJsonBody, resolvePublicBaseUrl, unauthorizedResponse } from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type CalendarExportLinkPayload = {
  token?: string;
  [key: string]: unknown;
};

function withProxyUrls(payload: CalendarExportLinkPayload, publicBaseUrl: string): CalendarExportLinkPayload {
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!token) {
    return payload;
  }

  const encoded = encodeURIComponent(token);
  return {
    ...payload,
    ics_url: `${publicBaseUrl}/api/v1/sardi/public/ics/${encoded}`,
    caldav_url: `${publicBaseUrl}/api/v1/sardi/public/caldav/${encoded}/calendar`
  };
}

export async function POST(req: NextRequest) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const origin = req.headers.get("origin");
    const response = await FetchBuilder.post()
      .url(makeBackendUrl("/api/v1/sardi/private/calendar-sync/export-link"))
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .body(body)
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as CalendarExportLinkPayload;
    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }

    const publicBaseUrl = resolvePublicBaseUrl(req);
    return NextResponse.json(withProxyUrls(payload, publicBaseUrl), { status: response.status });
  } catch {
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
