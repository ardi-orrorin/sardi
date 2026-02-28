import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/register/finish", baseUrl);
  const origin = req.headers.get("origin");

  try {
    const response = await FetchBuilder.post()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .body(body)
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("register finish error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
