"use client";

import { CheckIcon, EditIcon, PaletteIcon, PlusIcon, TrashIcon } from "@/app/_services/components/icons";
import { useMockShiftTypes } from "@/app/_services/hooks/use-mock-shift-types";
import {
  createMockShiftType,
  deleteMockShiftType,
  MockShiftType,
  refreshMockShiftTypes,
  updateMockShiftType
} from "@/app/_services/utils/mock-shift-types";
import { FormEvent, useMemo, useState } from "react";

type ShiftTypeFormState = {
  code: string;
  name: string;
  category: string;
  description: string;
  start: string;
  end: string;
  color: string;
  all_day: boolean;
};

const SHIFT_CATEGORIES = ["일반 근무", "휴무", "지원 슬롯"] as const;

const EMPTY_SHIFT_TYPE_FORM: ShiftTypeFormState = {
  code: "",
  name: "",
  category: "일반 근무",
  description: "",
  start: "09:00",
  end: "18:00",
  color: "#14B8A6",
  all_day: false
};

function normalizeHexColor(value: string) {
  const next = value.trim();
  return next.startsWith("#") ? next : `#${next}`;
}

function getReadableTextColor(hexColor: string) {
  const normalized = normalizeHexColor(hexColor).replace("#", "");
  if (normalized.length !== 6) {
    return "#F8FAFC";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness > 160 ? "#0F172A" : "#F8FAFC";
}

function toFormState(item?: MockShiftType): ShiftTypeFormState {
  if (!item) {
    return { ...EMPTY_SHIFT_TYPE_FORM };
  }

  return {
    code: item.code,
    name: item.name,
    category: item.category,
    description: item.description,
    start: item.start || "09:00",
    end: item.end || "18:00",
    color: item.color,
    all_day: item.all_day
  };
}

function describeShiftTime(item: MockShiftType) {
  if (item.all_day || !item.start || !item.end) {
    return "종일 또는 미정";
  }

  return `${item.start} - ${item.end}`;
}

export function MockShiftTypeManager() {
  const shiftTypes = useMockShiftTypes();
  const [form, setForm] = useState<ShiftTypeFormState>(EMPTY_SHIFT_TYPE_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");

  const activeCodes = useMemo(() => shiftTypes.map((item) => item.code).join(" · "), [shiftTypes]);

  const resetForm = () => {
    setForm({ ...EMPTY_SHIFT_TYPE_FORM });
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const description = form.description.trim();
    const color = normalizeHexColor(form.color);

    if (!code || !name) {
      setMessage("코드와 이름은 필수입니다.");
      setMessageKind("error");
      return;
    }

    const duplicated = shiftTypes.find((item) => item.code === code && item.id !== editingId);
    if (duplicated) {
      setMessage(`코드 ${code}는 이미 등록되어 있습니다.`);
      setMessageKind("error");
      return;
    }

    const nextItem = {
      code,
      name,
      category: form.category,
      description,
      start: form.all_day ? "" : form.start,
      end: form.all_day ? "" : form.end,
      color,
      text_color: getReadableTextColor(color),
      all_day: form.all_day
    };

    try {
      if (editingId) {
        await updateMockShiftType(editingId, nextItem);
      } else {
        await createMockShiftType(nextItem, shiftTypes.length);
      }

      resetForm();
      setMessage(editingId ? "근무 형태를 수정했습니다." : "근무 형태를 추가했습니다.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "근무 형태 저장에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const startEdit = (item: MockShiftType) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setMessage(`코드 ${item.code}를 편집 중입니다.`);
    setMessageKind("info");
  };

  const handleDelete = async (id: string) => {
    const target = shiftTypes.find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (!window.confirm(`${target.code} 근무 형태를 삭제할까요?`)) {
      return;
    }

    try {
      await deleteMockShiftType(id);

      if (editingId === id) {
        resetForm();
      }

      setMessage(`${target.code} 근무 형태를 삭제했습니다.`);
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "근무 형태 삭제에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMockShiftTypes(true);
      setMessage("근무 형태 목록을 다시 불러왔습니다.");
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "근무 형태 새로고침에 실패했습니다.");
      setMessageKind("error");
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-950/30 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-cyan-100/80 uppercase">
            <PaletteIcon className="h-3.5 w-3.5" />
            Shift Library
          </div>
          <p className="text-sm text-zinc-300">`O`, `M`, `C`, `N`, `OFF`, `OPEN` 같은 근무 형태를 등록하고 근무표 계산에 사용합니다.</p>
          <p className="text-xs text-zinc-500">현재 코드: {activeCodes || "없음"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200"
          >
            새로고침
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-xl px-3 py-2 text-xs ${
            messageKind === "error"
              ? "border border-rose-400/40 bg-rose-950/20 text-rose-200"
              : messageKind === "success"
                ? "border border-emerald-300/30 bg-emerald-950/20 text-emerald-100"
                : "border border-cyan-300/30 bg-cyan-950/20 text-cyan-100"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">{editingId ? "근무 형태 수정" : "근무 형태 추가"}</p>
              <p className="mt-1 text-xs text-zinc-400">코드, 이름, 시간, 색상을 먼저 정의합니다.</p>
            </div>
            <div
              className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-xl px-3 text-sm font-black"
              style={{ backgroundColor: form.color, color: getReadableTextColor(form.color) }}
            >
              {form.code.trim().toUpperCase() || "NEW"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">코드</span>
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                placeholder="예: O"
                maxLength={8}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">이름</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="예: 오픈"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">분류</span>
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              >
                {SHIFT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">대표 색상</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  className="h-11 w-14 rounded-lg border border-zinc-700 bg-zinc-900 p-1"
                />
                <input
                  value={form.color}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: normalizeHexColor(event.target.value) }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                />
              </div>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">시작 시간</span>
              <input
                type="time"
                value={form.start}
                onChange={(event) => setForm((prev) => ({ ...prev, start: event.target.value }))}
                disabled={form.all_day}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 disabled:opacity-40"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">종료 시간</span>
              <input
                type="time"
                value={form.end}
                onChange={(event) => setForm((prev) => ({ ...prev, end: event.target.value }))}
                disabled={form.all_day}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 disabled:opacity-40"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(event) => setForm((prev) => ({ ...prev, all_day: event.target.checked }))}
            />
            종일 일정 또는 시간 미정
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-300">설명</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="이 근무 형태가 어떤 상황에 쓰이는지 적어둡니다."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950"
            >
              {editingId ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
              {editingId ? "수정 저장" : "근무 형태 추가"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200"
            >
              편집 취소
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
            <p className="text-sm font-semibold text-zinc-50">등록된 근무 형태</p>
            <p className="mt-1 text-xs text-zinc-400">
              `OFF`, `OPEN` 같은 특수 코드도 같은 방식으로 관리합니다.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {shiftTypes.map((item) => (
              <article key={item.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="inline-flex min-w-[52px] items-center justify-center rounded-xl px-3 py-2 text-sm font-black"
                      style={{ backgroundColor: item.color, color: item.text_color }}
                    >
                      {item.code}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-50">{item.name}</p>
                      <p className="text-xs text-zinc-400">{item.category}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                    {describeShiftTime(item)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-300">{item.description || "설명 없음"}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-100"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-200"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
