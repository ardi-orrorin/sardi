"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import { useAuthActions } from "@/app/_services/hooks/use-auth-actions";
import PasskeyRegister from "@/app/passkey/passkey-register";
import { TopNavbar } from "@/app/_services/components/top-navbar";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ChangePasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

type CalendarExportLinkResponse = {
  export_id: string;
  label: string;
  token: string;
  expires_at: string;
  created_at: string;
  ics_url: string;
  caldav_url: string;
};

type CalendarExportListResponse = {
  items: CalendarExportLinkResponse[];
};

type CalendarExportLabelUpdateResponse = {
  export_id: string;
  label: string;
};

type CalendarExportDeleteResponse = {
  export_id: string;
  deleted: boolean;
};

type CalendarImportSyncResponse = {
  source_type: string;
  source_key: string;
  fetched_events: number;
  created: number;
  updated: number;
  deleted: number;
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
  const [calendarStatus, setCalendarStatus] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarExports, setCalendarExports] = useState<CalendarExportLinkResponse[]>([]);
  const [publicBaseUrl, setPublicBaseUrl] = useState("");
  const [calendarExportLabelInput, setCalendarExportLabelInput] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [extendLoadingId, setExtendLoadingId] = useState<string | null>(null);
  const [labelSavingId, setLabelSavingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);
  const [importForm, setImportForm] = useState({
    source_type: "caldav" as "caldav" | "ics",
    source_url: "",
    username: "",
    password: "",
    prune_missing: false
  });

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

  const loadCalendarExports = useCallback(async () => {
    setExportsLoading(true);
    try {
      const response = await FetchBuilder.get().url("/api/sardi/calendar-sync/export-links").executeResponse();
      const payload = (await response.json().catch(() => null)) as CalendarExportListResponse | null;
      if (!response.ok || !payload) {
        throw new Error("캘린더 export 링크 목록 조회 실패");
      }

      setCalendarExports(payload.items);
      setLabelDrafts(
        payload.items.reduce<Record<string, string>>((acc, item) => {
          acc[item.export_id] = item.label;
          return acc;
        }, {})
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 export 링크 목록 조회 실패";
      setCalendarError(message);
    } finally {
      setExportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendarExports();
  }, [loadCalendarExports]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicBaseUrl(window.location.origin);
    }
  }, []);

  const buildPublicUrl = (path: string) => {
    if (!publicBaseUrl) {
      return "";
    }
    return `${publicBaseUrl.replace(/\/$/, "")}${path}`;
  };

  const handleGenerateCalendarExport = async () => {
    setCalendarError("");
    setCalendarStatus("");
    setExportLoading(true);

    try {
      const label = calendarExportLabelInput.trim();
      const response = await FetchBuilder.post()
        .url("/api/sardi/calendar-sync/export-link")
        .body({
          expire_days: 365,
          label: label || undefined
        })
        .executeResponse();

      const payload = (await response.json().catch(() => null)) as CalendarExportLinkResponse | null;
      if (!response.ok || !payload) {
        throw new Error("캘린더 export 링크 생성 실패");
      }

      setCalendarExportLabelInput("");
      setCalendarStatus(`링크를 생성했습니다. (${payload.label})`);
      await loadCalendarExports();
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 export 링크 생성 실패";
      setCalendarError(message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportSync = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCalendarError("");
    setCalendarStatus("");

    const sourceUrl = importForm.source_url.trim();
    if (!sourceUrl) {
      setCalendarError("연동할 소스 URL을 입력하세요.");
      return;
    }

    setImportLoading(true);

    try {
      const response = await FetchBuilder.post()
        .url("/api/sardi/calendar-sync/import")
        .body({
          source_type: importForm.source_type,
          source_url: sourceUrl,
          username: importForm.username.trim() || undefined,
          password: importForm.password || undefined,
          prune_missing: importForm.prune_missing
        })
        .executeResponse();

      const payload = (await response.json().catch(() => null)) as CalendarImportSyncResponse | null;
      if (!response.ok || !payload) {
        throw new Error("캘린더 import sync 실패");
      }

      setCalendarStatus(
        `동기화 완료: 총 ${payload.fetched_events}건, 생성 ${payload.created}건, 수정 ${payload.updated}건, 삭제 ${payload.deleted}건`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 import sync 실패";
      setCalendarError(message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExtendCalendarExport = async (exportId: string) => {
    setCalendarError("");
    setCalendarStatus("");
    setExtendLoadingId(exportId);

    try {
      const response = await FetchBuilder.post()
        .url("/api/sardi/calendar-sync/export-link/extend")
        .body({
          export_id: exportId,
          extend_days: 30
        })
        .executeResponse();

      const payload = (await response.json().catch(() => null)) as { export_id: string; expires_at: string } | null;
      if (!response.ok || !payload) {
        throw new Error("캘린더 export 링크 연장 실패");
      }

      setCalendarExports((prev) =>
        prev.map((item) => (item.export_id === payload.export_id ? { ...item, expires_at: payload.expires_at } : item))
      );
      setCalendarStatus("링크 만료일을 30일 연장했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 export 링크 연장 실패";
      setCalendarError(message);
    } finally {
      setExtendLoadingId(null);
    }
  };

  const handleUpdateCalendarExportLabel = async (exportId: string) => {
    const label = (labelDrafts[exportId] ?? "").trim();
    if (!label) {
      setCalendarError("라벨을 입력하세요.");
      return;
    }

    setCalendarError("");
    setCalendarStatus("");
    setLabelSavingId(exportId);

    try {
      const response = await FetchBuilder.patch()
        .url("/api/sardi/calendar-sync/export-link/label")
        .body({
          export_id: exportId,
          label
        })
        .executeResponse();

      const payload = (await response.json().catch(() => null)) as CalendarExportLabelUpdateResponse | null;
      if (!response.ok || !payload) {
        throw new Error("캘린더 export 라벨 수정 실패");
      }

      setCalendarExports((prev) =>
        prev.map((item) => (item.export_id === payload.export_id ? { ...item, label: payload.label } : item))
      );
      setLabelDrafts((prev) => ({ ...prev, [payload.export_id]: payload.label }));
      setCalendarStatus("링크 라벨을 수정했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 export 라벨 수정 실패";
      setCalendarError(message);
    } finally {
      setLabelSavingId(null);
    }
  };

  const handleDeleteCalendarExport = async (exportId: string, label: string) => {
    const confirmed = window.confirm(`"${label}" 링크를 삭제할까요?`);
    if (!confirmed) {
      return;
    }

    setCalendarError("");
    setCalendarStatus("");
    setDeleteLoadingId(exportId);

    try {
      const response = await FetchBuilder.delete()
        .url(`/api/sardi/calendar-sync/export-link/${encodeURIComponent(exportId)}`)
        .executeResponse();

      const payload = (await response.json().catch(() => null)) as CalendarExportDeleteResponse | null;
      if (!response.ok || !payload?.deleted) {
        throw new Error("캘린더 export 링크 삭제 실패");
      }

      setCalendarExports((prev) => prev.filter((item) => item.export_id !== exportId));
      setLabelDrafts((prev) => {
        const next = { ...prev };
        delete next[exportId];
        return next;
      });
      setCalendarStatus("링크를 삭제했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "캘린더 export 링크 삭제 실패";
      setCalendarError(message);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCalendarStatus("링크를 복사했습니다.");
    } catch {
      setCalendarError("클립보드 복사 실패");
    }
  };

  return (
    <div className="space-y-4">
      <TopNavbar current="account" title="계정 설정" onLogout={() => void logout()} />

      {errorMessage ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">{errorMessage}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">{statusMessage}</div>
      ) : null}

      <section className="grid items-stretch gap-4 p-0 lg:grid-cols-2">
        <form onSubmit={handleChangePassword} className="flex h-full flex-col rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <div className="space-y-3">
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

      <section className="grid gap-4 p-0 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <div>
            <h2 className="text-sm font-semibold">CalDAV / ICS 내보내기</h2>
            <p className="text-xs text-teal-100/70">
              애플 캘린더 등 CalDAV 클라이언트 연결용 URL과 ICS 구독 URL을 생성합니다.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-teal-100/15 bg-black/20 p-3 text-xs text-teal-100/80">
            <p className="text-sm font-semibold text-teal-100">계정 로그인 방식 (권장)</p>
            <p>서버: {publicBaseUrl || "(현재 도메인)"}</p>
            <p>사용자명: SARDI 로그인 이메일</p>
            <p>비밀번호: SARDI 계정 비밀번호</p>
            <div className="space-y-1">
              <p className="font-semibold text-teal-100">자동 탐색 URL</p>
              <p className="break-all">{buildPublicUrl("/.well-known/caldav")}</p>
              <button
                type="button"
                onClick={() => void copyText(buildPublicUrl("/.well-known/caldav"))}
                className="rounded-md border border-teal-100/40 px-2 py-1 text-[11px] text-teal-100"
                disabled={!publicBaseUrl}
              >
                자동 탐색 URL 복사
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-teal-100">수동 CalDAV URL</p>
              <p className="break-all">{buildPublicUrl("/api/v1/sardi/public/caldav")}</p>
              <button
                type="button"
                onClick={() => void copyText(buildPublicUrl("/api/v1/sardi/public/caldav"))}
                className="rounded-md border border-teal-100/40 px-2 py-1 text-[11px] text-teal-100"
                disabled={!publicBaseUrl}
              >
                수동 CalDAV URL 복사
              </button>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-teal-100">계정 인증 ICS URL</p>
              <p className="break-all">{buildPublicUrl("/api/v1/sardi/public/ics")}</p>
              <button
                type="button"
                onClick={() => void copyText(buildPublicUrl("/api/v1/sardi/public/ics"))}
                className="rounded-md border border-teal-100/40 px-2 py-1 text-[11px] text-teal-100"
                disabled={!publicBaseUrl}
              >
                ICS URL 복사
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-teal-100/80">새 링크 라벨 (선택)</label>
            <input
              type="text"
              value={calendarExportLabelInput}
              onChange={(event) => setCalendarExportLabelInput(event.target.value)}
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              placeholder="예: iPhone, Outlook"
              maxLength={80}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleGenerateCalendarExport()}
            disabled={exportLoading}
            className="w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportLoading ? "생성 중..." : "CalDAV / ICS 링크 생성"}
          </button>

          {exportsLoading ? <p className="text-xs text-teal-100/70">링크 목록 불러오는 중...</p> : null}

          {calendarExports.length > 0 ? (
            <div className="space-y-2">
              {calendarExports.map((item) => (
                <div key={item.export_id} className="space-y-2 rounded-xl border border-teal-200/20 bg-teal-950/20 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={labelDrafts[item.export_id] ?? item.label}
                      onChange={(event) =>
                        setLabelDrafts((prev) => ({
                          ...prev,
                          [item.export_id]: event.target.value
                        }))
                      }
                      className="h-10 w-full rounded-md border border-teal-100/20 bg-teal-950/40 px-3 text-sm"
                      maxLength={80}
                    />
                    <button
                      type="button"
                      onClick={() => void handleUpdateCalendarExportLabel(item.export_id)}
                      disabled={labelSavingId === item.export_id}
                      className="h-10 min-w-[88px] shrink-0 whitespace-nowrap rounded-md border border-teal-100/40 px-3 text-xs text-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {labelSavingId === item.export_id ? "저장 중..." : "라벨 저장"}
                    </button>
                  </div>

                  <p className="text-[11px] text-teal-100/70">생성일: {new Date(item.created_at).toLocaleString()}</p>
                  <p className="text-[11px] text-teal-100/70">만료일: {new Date(item.expires_at).toLocaleString()}</p>

                  <div className="space-y-1">
                    <p className="font-semibold text-teal-100">CalDAV URL</p>
                    <p className="break-all text-teal-100/80">{item.caldav_url}</p>
                    <button
                      type="button"
                      onClick={() => void copyText(item.caldav_url)}
                      className="rounded-md border border-teal-100/40 px-2 py-1 text-[11px] text-teal-100"
                    >
                      CalDAV URL 복사
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-teal-100">ICS URL</p>
                    <p className="break-all text-teal-100/80">{item.ics_url}</p>
                    <button
                      type="button"
                      onClick={() => void copyText(item.ics_url)}
                      className="rounded-md border border-teal-100/40 px-2 py-1 text-[11px] text-teal-100"
                    >
                      ICS URL 복사
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleExtendCalendarExport(item.export_id)}
                      disabled={extendLoadingId === item.export_id}
                      className="w-full rounded-md border border-teal-100/40 px-2 py-2 text-xs text-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {extendLoadingId === item.export_id ? "연장 중..." : "만료일 30일 연장"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteCalendarExport(item.export_id, item.label)}
                      disabled={deleteLoadingId === item.export_id}
                      className="w-full rounded-md border border-rose-200/40 px-2 py-2 text-xs text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleteLoadingId === item.export_id ? "삭제 중..." : "링크 삭제"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !exportsLoading ? (
            <div className="rounded-xl border border-teal-100/15 bg-black/20 px-3 py-2 text-xs text-teal-100/70">
              생성된 CalDAV/ICS 링크가 없습니다.
            </div>
          ) : null}
        </div>

        <form onSubmit={handleImportSync} className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <div>
            <h2 className="text-sm font-semibold">CalDAV / ICS 가져오기 동기화</h2>
            <p className="text-xs text-teal-100/70">외부 캘린더 URL에서 일정을 읽어와 SARDI 일정으로 동기화합니다.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setImportForm((prev) => ({ ...prev, source_type: "caldav" }))}
              className={`rounded-lg border px-2 py-2 ${importForm.source_type === "caldav" ? "border-teal-200 bg-teal-500/20 text-teal-50" : "border-teal-100/20 text-teal-100/70"}`}
            >
              CalDAV
            </button>
            <button
              type="button"
              onClick={() => setImportForm((prev) => ({ ...prev, source_type: "ics" }))}
              className={`rounded-lg border px-2 py-2 ${importForm.source_type === "ics" ? "border-teal-200 bg-teal-500/20 text-teal-50" : "border-teal-100/20 text-teal-100/70"}`}
            >
              ICS
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-teal-100/80">소스 URL</label>
            <input
              type="url"
              value={importForm.source_url}
              onChange={(event) => setImportForm((prev) => ({ ...prev, source_url: event.target.value }))}
              className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              placeholder="https://example.com/caldav/calendar"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-teal-100/80">사용자명 (선택)</label>
              <input
                type="text"
                value={importForm.username}
                onChange={(event) => setImportForm((prev) => ({ ...prev, username: event.target.value }))}
                className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-teal-100/80">비밀번호 (선택)</label>
              <input
                type="password"
                value={importForm.password}
                onChange={(event) => setImportForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-teal-100/80">
            <input
              type="checkbox"
              checked={importForm.prune_missing}
              onChange={(event) => setImportForm((prev) => ({ ...prev, prune_missing: event.target.checked }))}
              className="h-4 w-4 rounded border-teal-200/40"
            />
            원본에 없는 연동 일정은 삭제(prune)
          </label>

          <button
            type="submit"
            disabled={importLoading}
            className="w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importLoading ? "동기화 중..." : "가져오기 동기화 실행"}
          </button>
        </form>
      </section>

      {calendarError ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">{calendarError}</div>
      ) : null}
      {calendarStatus ? (
        <div className="rounded-xl border border-blue-300/45 bg-blue-950/20 px-3 py-2 text-xs text-blue-100">{calendarStatus}</div>
      ) : null}
    </div>
  );
}
