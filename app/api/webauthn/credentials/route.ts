import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/credentials", baseUrl);
  const origin = req.headers.get("origin");

  try {
    const response = await FetchBuilder.get()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("credentials GET error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/webauthn/credentials", baseUrl);
  const origin = req.headers.get("origin");

  try {
    const response = await FetchBuilder.delete()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .executeResponse();

    const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("credentials DELETE error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
