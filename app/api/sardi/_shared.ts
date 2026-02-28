import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function readAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export function makeBackendUrl(pathname: string) {
  return new URL(pathname, getBackendBaseUrl()).toString();
}

export async function proxyRequest(
  req: NextRequest,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  pathname: string,
  token: string,
  body?: unknown
) {
  const origin = req.headers.get("origin");

  const builder =
    method === "GET"
      ? FetchBuilder.get()
      : method === "POST"
        ? FetchBuilder.post()
        : method === "PATCH"
          ? FetchBuilder.patch()
          : FetchBuilder.delete();

  const response = await builder
    .url(makeBackendUrl(pathname))
    .header("Authorization", `Bearer ${token}`)
    .headers(origin ? { Origin: origin } : {})
    .body(body)
    .executeResponse();

  const payload = (await response.json().catch(() => ({ error: "request failed" }))) as Record<
    string,
    unknown
  >;

  return NextResponse.json(payload, { status: response.status });
}
