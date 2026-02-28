"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ScheduleLabel = {
  id: string;
  name: string;
  color: string;
  create_at: string;
};

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const valid = /^#[0-9A-Fa-f]{6}$/.test(prefixed);
  return valid ? prefixed.toUpperCase() : "";
};

export default function LabelSettings() {
  const router = useRouter();

  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<ScheduleLabel[]>([]);
  const [labelForm, setLabelForm] = useState({
    name: "",
    color: "#0EA5E9"
  });

  const loadLabels = useCallback(async () => {
    const payload = await FetchBuilder.get().url("/api/sardi/schedule-labels").execute<ScheduleLabel[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "라벨 조회 실패");
    }

    setLabels(payload);
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setStatusMessage("");
      try {
        await loadLabels();
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "라벨 조회 실패");
      } finally {
        setLoading(false);
      }
    };

    void loadAll();
  }, [loadLabels]);

  const handleLogout = async () => {
    await FetchBuilder.post().url("/api/auth/logout").execute();
    router.replace("/login");
  };

  const handleCreateLabel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = labelForm.name.trim();
    const color = normalizeHexColor(labelForm.color);

    if (!name) {
      setStatusMessage("라벨 이름을 입력하세요.");
      return;
    }

    if (!color) {
      setStatusMessage("색상은 #RRGGBB 형식이어야 합니다.");
      return;
    }

    setStatusMessage("");

    try {
      const payload = await FetchBuilder.post()
        .url("/api/sardi/schedule-labels")
        .body({ name, color })
        .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? "라벨 등록 실패");
      }

      setLabelForm((prev) => ({ ...prev, name: "" }));
      await loadLabels();
      setStatusMessage("라벨이 등록되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "라벨 등록 실패";
      setStatusMessage(message);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-black/30 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">SARDI</p>
          <h1 className="text-lg font-bold">라벨 설정</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-100">
            스케줄
          </Link>
          <Link href="/settings/shifts" className="rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-100">
            근무 설정
          </Link>
          <Link href="/settings/account" className="rounded-lg border border-cyan-300/40 px-3 py-1 text-xs text-cyan-100">
            계정 설정
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-rose-300/40 px-3 py-1 text-xs text-rose-200"
          >
            로그아웃
          </button>
        </div>
      </header>

      {statusMessage ? (
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <form onSubmit={handleCreateLabel} className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">라벨 등록</h2>
          <input
            value={labelForm.name}
            onChange={(event) => setLabelForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="예: 개인 일정"
            className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <input
              value={labelForm.color}
              onChange={(event) => setLabelForm((prev) => ({ ...prev, color: event.target.value }))}
              placeholder="#0EA5E9"
              className="rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm uppercase"
            />
            <input
              type="color"
              value={normalizeHexColor(labelForm.color) || "#0EA5E9"}
              onChange={(event) => setLabelForm((prev) => ({ ...prev, color: event.target.value }))}
              className="h-10 w-full cursor-pointer rounded-lg border border-teal-100/20 bg-teal-950/30 px-1"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950">
            라벨 추가
          </button>
        </form>

        <div className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">등록된 라벨</h2>
          <div className="space-y-2">
            {labels.length === 0 ? (
              <p className="text-xs text-teal-100/70">등록된 라벨이 없습니다.</p>
            ) : (
              labels.map((label) => (
                <div key={label.id} className="flex items-center justify-between rounded-lg border border-teal-100/15 bg-black/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                    <p className="text-sm text-teal-50">{label.name}</p>
                  </div>
                  <p className="text-xs text-teal-100/60">{label.color}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {loading ? <p className="text-xs text-cyan-100/70">로딩 중...</p> : null}
    </div>
  );
}
