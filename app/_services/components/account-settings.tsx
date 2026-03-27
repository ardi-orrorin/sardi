"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import { TopNavbar } from "@/app/_services/components/top-navbar";
import { useAuthActions } from "@/app/_services/hooks/use-auth-actions";
import PasskeyRegister from "@/app/passkey/passkey-register";
import { FormEvent, useState } from "react";

type ChangePasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default function AccountSettings() {
  const { logout } = useAuthActions();

  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

      await logout("/login?error=password_changed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "비밀번호 변경 실패";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <TopNavbar current="account" title="계정 설정" onLogout={() => void logout()} />

      {errorMessage ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">
          {errorMessage}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid items-stretch gap-4 p-0 lg:grid-cols-2">
        <form onSubmit={handleChangePassword} className="flex h-full flex-col rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold">비밀번호 변경</h2>
              <p className="text-xs text-teal-100/70">계정 보안 관련 설정만 남겨둔 화면입니다.</p>
            </div>

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
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-auto w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>

        <div className="flex h-full flex-col space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
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
