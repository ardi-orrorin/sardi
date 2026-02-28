import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AliasPayload = {
  alias: string;
};

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as AliasPayload | null;
  if (!payload || typeof payload.alias !== "string") {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const { id } = await params;
  const baseUrl = getBackendBaseUrl();
  const url = new URL(`/api/v1/common/webauthn/credentials/${encodeURIComponent(id)}`, baseUrl);
  const origin = req.headers.get("origin");

  try {
    const response = await FetchBuilder.patch()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .headers(origin ? { Origin: origin } : {})
      .body(payload)
      .executeResponse();

    const responseBody = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("credential PATCH error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const baseUrl = getBackendBaseUrl();
  const url = new URL(`/api/v1/common/webauthn/credentials/${encodeURIComponent(id)}`, baseUrl);

  try {
    const response = await FetchBuilder.delete()
      .url(url.toString())
      .header("Authorization", `Bearer ${token}`)
      .executeResponse();

    const responseBody = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
      string,
      unknown
    >;

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error) {
    console.error("credential DELETE error:", error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
