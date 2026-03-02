import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type ProxyMethod = "GET" | "POST" | "PATCH" | "DELETE";

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
  method: ProxyMethod,
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

export async function readJsonBody(req: NextRequest) {
  return req.json().catch(() => null);
}

type HandleProxyOptions = {
  requireBody?: boolean;
  body?: unknown;
  logLabel: string;
};

export async function handleSardiProxy(
  req: NextRequest,
  method: ProxyMethod,
  pathname: string,
  options: HandleProxyOptions
) {
  const token = await readAuthToken();
  if (!token) {
    return unauthorizedResponse();
  }

  let body = options.body;
  if (options.requireBody && body === undefined) {
    body = await readJsonBody(req);
    if (!body) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }
  }

  try {
    return await proxyRequest(req, method, pathname, token, body);
  } catch (error) {
    console.error(`${options.logLabel} error:`, error);
    return NextResponse.json({ error: "request failed" }, { status: 500 });
  }
}
