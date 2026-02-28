import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChangePasswordRequest = {
  current_password: string;
  new_password: string;
};

const isChangePasswordRequest = (value: unknown): value is ChangePasswordRequest => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.current_password === "string" && typeof payload.new_password === "string";
};

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as unknown;
    if (!isChangePasswordRequest(payload)) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const baseUrl = getBackendBaseUrl();
    const url = new URL("/api/v1/common/auth/change-password", baseUrl);
    const origin = request.headers.get("origin");

    const response = await FetchBuilder.post()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .body(payload)
      .executeResponse();

    const body = (await response.json().catch(() => ({ error: "request failed" }))) as Record<string, unknown>;
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("change-password route error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
