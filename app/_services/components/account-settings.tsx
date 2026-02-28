"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import PasskeyRegister from "@/app/passkey/passkey-register";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type IconProps = {
  className?: string;
};

type ChangePasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

function LogoutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function AccountSettings() {
  const router = useRouter();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogout = async () => {
    await FetchBuilder.post().url("/api/auth/logout").execute();
    router.replace("/login");
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    const currentPassword = form.current_password.trim();
    const newPassword = form.new_password.trim();
    const confirmPassword = form.confirm_password.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("현재 비밀번호/새 비밀번호/확인 비밀번호를 모두 입력하세요.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("새 비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setSaving(true);

    try {
      const response = await FetchBuilder.post()
        .url("/api/auth/change-password")
        .body({
          current_password: currentPassword,
          new_password: newPassword
        })
        .executeResponse();

      const payload = (await response.json().catch(() => ({}))) as ChangePasswordResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? payload.message ?? "비밀번호 변경 실패");
      }

      setStatusMessage("비밀번호를 변경했습니다. 다시 로그인합니다.");
      setForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });

      await FetchBuilder.post().url("/api/auth/logout").execute();
      router.replace("/login?error=password_changed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "비밀번호 변경 실패";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-black/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">SARDI</p>
          <h1 className="text-lg font-bold leading-tight">계정 설정</h1>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 md:flex md:w-auto md:flex-wrap">
          <Link
            href="/settings/shifts"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-300/40 px-2 py-2 text-[13px] font-semibold text-cyan-100 md:px-3 md:py-1 md:text-sm"
          >
            근무 설정
          </Link>
          <Link
            href="/settings/account"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-300/40 px-2 py-2 text-[13px] font-semibold text-cyan-100 md:px-3 md:py-1 md:text-sm"
          >
            계정 설정
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-lg border border-rose-300/40 px-2 py-2 text-rose-200 md:px-3 md:py-1"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogoutIcon />
            <span className="sr-only">로그아웃</span>
          </button>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-300/40 bg-rose-950/20 px-3 py-2 text-xs text-rose-100">{errorMessage}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">{statusMessage}</div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={handleChangePassword} className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">비밀번호 변경</h2>
          <div className="space-y-1">
            <label htmlFor="current-password" className="text-xs text-teal-100/80">
              현재 비밀번호
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={(event) => setForm((prev) => ({ ...prev, current_password: event.target.value }))}
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs text-teal-100/80">
              새 비밀번호
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={(event) => setForm((prev) => ({ ...prev, new_password: event.target.value }))}
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              minLength={8}
              required
            />
            <p className="text-[11px] text-teal-100/70">최소 8자 이상 입력하세요.</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-xs text-teal-100/80">
              새 비밀번호 확인
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={(event) => setForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>

        <div className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <div>
            <h2 className="text-sm font-semibold">패스키 설정</h2>
            <p className="text-xs text-teal-100/70">패스키 등록, 별칭 수정, 삭제를 관리할 수 있습니다.</p>
          </div>
          <PasskeyRegister />
        </div>
      </section>
    </div>
  );
}
