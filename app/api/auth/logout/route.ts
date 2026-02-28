import { NextResponse } from "next/server";

import { AUTH_COOKIE_CLEAR_OPTIONS, AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", AUTH_COOKIE_CLEAR_OPTIONS);
  return response;
}
