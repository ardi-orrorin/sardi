"use client";

import { CheckIcon, EditIcon, PlusIcon, TrashIcon } from "@/app/_services/components/icons";
import { useMockCompanyEvents } from "@/app/_services/hooks/use-mock-company-events";
import {
  createMockCompanyEvent,
  deleteMockCompanyEvent,
  MockCompanyEvent,
  refreshMockCompanyEvents,
  updateMockCompanyEvent
} from "@/app/_services/utils/mock-company-events";
import { FormEvent, useState } from "react";

type CompanyEventFormState = {
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  repeat_interval_days: number;
  repeat_count: number;
  color: string;
  note: string;
  all_day: boolean;
};

const EMPTY_EVENT_FORM: CompanyEventFormState = {
  title: "",
  category: "운영",
  start_date: "2026-04-03",
  end_date: "2026-04-03",
  repeat_interval_days: 7,
  repeat_count: 1,
  color: "#0EA5E9",
  note: "",
  all_day: true
};

function toFormState(item?: MockCompanyEvent): CompanyEventFormState {
  if (!item) {
    return { ...EMPTY_EVENT_FORM };
  }

  return {
    title: item.title,
    category: item.category,
    start_date: item.start_date,
    end_date: item.end_date,
    repeat_interval_days: item.repeat_interval_days,
    repeat_count: item.repeat_count,
    color: item.color,
    note: item.note,
    all_day: item.all_day
  };
}

function describeRepeatRule(item: Pick<MockCompanyEvent, "repeat_interval_days" | "repeat_count">) {
  if (item.repeat_count <= 1) {
    return "반복 없음";
  }

  return `${item.repeat_interval_days}일 간격 · 총 ${item.repeat_count}회`;
}

export function MockCompanyEventManager() {
  const companyEvents = useMockCompanyEvents();
  const [form, setForm] = useState<CompanyEventFormState>(EMPTY_EVENT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");

  const resetForm = () => {
    setForm({ ...EMPTY_EVENT_FORM });
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const category = form.category.trim();
    const note = form.note.trim();

    if (!title || !category) {
      setMessage("이벤트 제목과 분류는 필수입니다.");
      setMessageKind("error");
      return;
    }

    if (form.end_date < form.start_date) {
      setMessage("종료일은 시작일보다 빠를 수 없습니다.");
      setMessageKind("error");
      return;
    }

    if (form.repeat_interval_days < 1) {
      setMessage("반복 간격은 1일 이상이어야 합니다.");
      setMessageKind("error");
      return;
    }

    if (form.repeat_count < 1) {
      setMessage("반복 횟수는 1회 이상이어야 합니다.");
      setMessageKind("error");
      return;
    }

    const nextEvent = {
      title,
      category,
      start_date: form.start_date,
      end_date: form.end_date,
      repeat_interval_days: form.repeat_interval_days,
      repeat_count: form.repeat_count,
      color: form.color,
      note,
      all_day: form.all_day
    };

    try {
      if (editingId) {
        await updateMockCompanyEvent(editingId, nextEvent);
      } else {
        await createMockCompanyEvent(nextEvent);
      }

      resetForm();
      setMessage(editingId ? "회사 이벤트를 수정했습니다." : "회사 이벤트를 추가했습니다.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회사 이벤트 저장에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const startEdit = (item: MockCompanyEvent) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setMessage(`${item.title} 이벤트를 편집 중입니다.`);
    setMessageKind("info");
  };

  const handleDelete = async (id: string) => {
    const target = companyEvents.find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (!window.confirm(`${target.title} 이벤트를 삭제할까요?`)) {
      return;
    }

    try {
      await deleteMockCompanyEvent(id);

      if (editingId === id) {
        resetForm();
      }

      setMessage(`${target.title} 이벤트를 삭제했습니다.`);
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회사 이벤트 삭제에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMockCompanyEvents(true);
      setMessage("회사 이벤트 목록을 다시 불러왔습니다.");
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회사 이벤트 새로고침에 실패했습니다.");
      setMessageKind("error");
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-zinc-300">사내 행사, 프로모션, 재고 실사 같은 이벤트를 CRUD하고 스케줄 표에 함께 표시합니다.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200"
        >
          새로고침
        </button>
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-50">{editingId ? "회사 이벤트 수정" : "회사 이벤트 추가"}</p>
            <p className="mt-1 text-xs text-zinc-400">여기서 만든 이벤트는 일간/주간/월간 표에 모두 나타납니다.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-zinc-300">제목</span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                placeholder="예: 전사 타운홀"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">분류</span>
              <input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                placeholder="예: 사내 행사"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">색상</span>
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-1"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">시작일</span>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">종료일</span>
              <input
                type="date"
                value={form.end_date}
                onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">반복 간격(일)</span>
              <input
                type="number"
                min={1}
                value={form.repeat_interval_days}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, repeat_interval_days: Number(event.target.value) || 1 }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">반복 횟수</span>
              <input
                type="number"
                min={1}
                value={form.repeat_count}
                onChange={(event) => setForm((prev) => ({ ...prev, repeat_count: Number(event.target.value) || 1 }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              />
            </label>
          </div>

          <p className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400">
            현재 규칙: {describeRepeatRule(form)}
          </p>

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={form.all_day}
              onChange={(event) => setForm((prev) => ({ ...prev, all_day: event.target.checked }))}
            />
            종일 이벤트
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-300">메모</span>
            <textarea
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              placeholder="운영 참고 사항"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950"
            >
              {editingId ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
              {editingId ? "수정 저장" : "이벤트 추가"}
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

        <div className="grid gap-3 md:grid-cols-2">
          {companyEvents.map((companyEvent) => (
            <article key={companyEvent.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-50">{companyEvent.title}</p>
                  <p className="mt-1 text-xs text-zinc-400">{companyEvent.category}</p>
                </div>
                <span
                  className="inline-flex h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: companyEvent.color }}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3 space-y-1 text-xs text-zinc-400">
                <p>
                  {companyEvent.start_date} - {companyEvent.end_date}
                </p>
                <p>{describeRepeatRule(companyEvent)}</p>
                <p>{companyEvent.all_day ? "종일 이벤트" : "시간 지정 이벤트"}</p>
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-300">{companyEvent.note || "메모 없음"}</p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(companyEvent)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-100"
                >
                  <EditIcon className="h-3.5 w-3.5" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(companyEvent.id)}
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
    </section>
  );
}
