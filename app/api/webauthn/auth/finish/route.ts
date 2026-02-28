import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuthFinishPayload = {
  service: string;
  challenge_id: string;
  credential: unknown;
};

type AuthFinishResponse = {
  token?: string;
  error?: string;
};

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as AuthFinishPayload | null;
  if (!payload?.service || !payload?.challenge_id || !payload.credential) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/auth/finish", baseUrl);
  const origin = req.headers.get("origin");

  try {
    const response = await FetchBuilder.post()
      .url(url.toString())
      .header("Content-Type", "application/json")
      .headers(origin ? { Origin: origin } : {})
      .body(payload)
      .executeResponse();

    const responseBody = (await response.json().catch(() => ({ error: "auth failed" }))) as AuthFinishResponse;

    if (!response.ok) {
      return NextResponse.json(responseBody, { status: response.status });
    }

    const token = responseBody.token;
    if (!token) {
      return NextResponse.json({ error: "token missing" }, { status: 502 });
    }

    const success = NextResponse.json({ ok: true });
    success.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    return success;
  } catch (error) {
    console.error("WebAuthn finish error:", error);
    return NextResponse.json({ error: "auth failed" }, { status: 500 });
  }
}
