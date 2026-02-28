import { AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS, AUTH_SERVICE_NAME } from "@/app/_commons/constants/auth";
import { FetchBuilder, getBackendBaseUrl } from "@/app/_commons/utils/func";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import WebauthnLogin from "./webauthn-login";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const pwd = String(formData.get("pwd") ?? "").trim();

  if (!email || !pwd) {
    redirect("/login?error=required_fields");
  }

  const baseUrl = getBackendBaseUrl();
  const url = new URL("/api/v1/common/auth/login", baseUrl);

  try {
    const payload = await FetchBuilder.post()
      .url(url.toString())
      .body({ email, pwd, service: AUTH_SERVICE_NAME })
      .execute<{ token?: string; message?: string }>();

    if (!payload?.token) {
      const message = payload?.message ?? "login_failed";
      redirect(`/login?error=${encodeURIComponent(message)}`);
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, payload.token, AUTH_COOKIE_OPTIONS);
    redirect("/");
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    redirect("/login?error=login_error");
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    redirect("/");
  }

  const resolved = (await searchParams) ?? {};

  const messages: Record<string, string> = {
    required_fields: "이메일과 비밀번호를 입력하세요.",
    login_failed: "로그인에 실패했습니다.",
    login_error: "로그인 중 오류가 발생했습니다.",
    unauthorized: "로그인이 필요합니다.",
    password_changed: "비밀번호가 변경되어 다시 로그인해 주세요."
  };

  const error = resolved.error ? messages[resolved.error] ?? resolved.error : "";

  return (
    <div className="app-shell">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        <section className="rounded-3xl border border-teal-300/20 bg-black/35 p-6 backdrop-blur">
          <header className="mb-6 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-teal-200/70">SARDI</p>
            <h1 className="text-3xl font-bold">교대 스케줄 로그인</h1>
          </header>

          <form action={loginAction} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-teal-100/80">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-teal-200/25 bg-teal-950/30 px-3 py-2 text-sm text-teal-50 placeholder:text-teal-100/30 focus:border-teal-300 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="pwd" className="text-xs font-semibold text-teal-100/80">
                비밀번호
              </label>
              <input
                id="pwd"
                name="pwd"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-teal-200/25 bg-teal-950/30 px-3 py-2 text-sm text-teal-50 placeholder:text-teal-100/30 focus:border-teal-300 focus:outline-none"
              />
            </div>

            {error ? <p className="text-xs text-rose-200">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-teal-300 px-4 py-2 text-sm font-bold text-teal-950 transition hover:bg-teal-200"
            >
              로그인
            </button>
          </form>

          <div className="my-6 flex items-center gap-2 text-xs text-teal-100/50">
            <span className="h-px flex-1 bg-teal-200/20" />
            PASSKEY
            <span className="h-px flex-1 bg-teal-200/20" />
          </div>

          <WebauthnLogin />
        </section>
      </main>
    </div>
  );
}
