import { AUTH_COOKIE_NAME, AUTH_SERVICE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/register/options", baseUrl);
  const origin = req.headers.get("origin");

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!body.service) {
    body.service = AUTH_SERVICE_NAME;
  }

  try {
    const response = await FetchBuilder.post()
      .url(url.toString())
      .headers({
        Authorization: `Bearer ${token}`,
        ...(origin ? { Origin: origin } : {})
      })
      .body(body)
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("register options error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
