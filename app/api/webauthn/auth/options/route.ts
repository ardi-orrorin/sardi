import { AUTH_COOKIE_NAME, AUTH_SERVICE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/auth/options", baseUrl);
  const origin = req.headers.get("origin");

  try {
    const fetchBuilder = FetchBuilder.post()
      .url(url.toString())
      .body({ service: AUTH_SERVICE_NAME })
      .headers(origin ? { Origin: origin } : {});

    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (token) {
      fetchBuilder.header("Authorization", `Bearer ${token}`);
    }

    const response = await fetchBuilder.executeResponse();
    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("WebAuthn options error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
