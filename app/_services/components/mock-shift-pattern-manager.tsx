"use client";

import { CheckIcon, CloseIcon, EditIcon, PlusIcon, TrashIcon } from "@/app/_services/components/icons";
import { useMockEmployees } from "@/app/_services/hooks/use-mock-employees";
import { useMockShiftPatterns } from "@/app/_services/hooks/use-mock-shift-patterns";
import { useMockShiftTypes } from "@/app/_services/hooks/use-mock-shift-types";
import { refreshMockEmployees } from "@/app/_services/utils/mock-employees";
import {
  createMockShiftPattern,
  deleteMockShiftPattern,
  MockShiftPattern,
  refreshMockShiftPatterns,
  updateMockShiftPattern
} from "@/app/_services/utils/mock-shift-patterns";
import { FormEvent, useMemo, useState } from "react";

type PatternFormState = {
  name: string;
  description: string;
  sequence_codes: string[];
};

const EMPTY_PATTERN_FORM: PatternFormState = {
  name: "",
  description: "",
  sequence_codes: []
};

function toFormState(item?: MockShiftPattern): PatternFormState {
  if (!item) {
    return { ...EMPTY_PATTERN_FORM };
  }

  return {
    name: item.name,
    description: item.description,
    sequence_codes: [...item.sequence]
  };
}

export function MockShiftPatternManager() {
  const patterns = useMockShiftPatterns();
  const shiftTypes = useMockShiftTypes();
  const employees = useMockEmployees();
  const [form, setForm] = useState<PatternFormState>(EMPTY_PATTERN_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");

  const shiftTypeCodes = useMemo(() => new Set(shiftTypes.map((item) => item.code)), [shiftTypes]);
  const shiftTypeMap = useMemo(
    () =>
      new Map(
        shiftTypes.map((item) => [
          item.code,
          item
        ])
      ),
    [shiftTypes]
  );

  const resetForm = () => {
    setForm({ ...EMPTY_PATTERN_FORM });
    setEditingId(null);
  };

  const appendSequenceCode = (code: string) => {
    setForm((prev) => ({
      ...prev,
      sequence_codes: [...prev.sequence_codes, code]
    }));
  };

  const removeSequenceCodeAt = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sequence_codes: prev.sequence_codes.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const clearSequenceCodes = () => {
    setForm((prev) => ({
      ...prev,
      sequence_codes: []
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();
    const sequence = form.sequence_codes.map((code) => code.trim().toUpperCase()).filter(Boolean);

    if (!name || sequence.length === 0) {
      setMessage("패턴 이름과 최소 1개 이상의 코드가 필요합니다.");
      setMessageKind("error");
      return;
    }

    const unknownCodes = sequence.filter((code) => !shiftTypeCodes.has(code));
    if (unknownCodes.length > 0) {
      setMessage(`등록되지 않은 근무 코드가 있습니다: ${unknownCodes.join(", ")}`);
      setMessageKind("error");
      return;
    }

    const nextPattern = {
      name,
      description,
      sequence
    };

    try {
      if (editingId) {
        await updateMockShiftPattern(editingId, nextPattern, shiftTypes);
      } else {
        await createMockShiftPattern(nextPattern, shiftTypes);
      }

      resetForm();
      setMessage(editingId ? "반복 패턴을 수정했습니다." : "반복 패턴을 추가했습니다.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "반복 패턴 저장에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const startEdit = (item: MockShiftPattern) => {
    setEditingId(item.id);
    setForm(toFormState(item));
    setMessage(`${item.name} 패턴을 편집 중입니다.`);
    setMessageKind("info");
  };

  const handleDelete = async (id: string) => {
    const target = patterns.find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (!window.confirm(`${target.name} 패턴을 삭제할까요? 연결된 직원은 패턴 미지정으로 바뀝니다.`)) {
      return;
    }

    try {
      await deleteMockShiftPattern(id);
      await refreshMockEmployees(true);

      if (editingId === id) {
        resetForm();
      }

      setMessage(`${target.name} 패턴을 삭제했습니다.`);
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "반복 패턴 삭제에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMockShiftPatterns(true);
      setMessage("반복 패턴 목록을 다시 불러왔습니다.");
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "반복 패턴 새로고침에 실패했습니다.");
      setMessageKind("error");
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-zinc-300">`O O N OFF OFF` 같은 시퀀스를 패턴으로 만들고, 직원에게 연결해 반복 스케줄을 계산합니다.</p>
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
            <p className="text-sm font-semibold text-zinc-50">{editingId ? "반복 패턴 수정" : "반복 패턴 추가"}</p>
            <p className="mt-1 text-xs text-zinc-400">등록된 근무 형태를 골라서 순서대로 조합합니다.</p>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-300">패턴 이름</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              placeholder="예: 오픈-미들-마감"
              required
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-300">패턴 코드 조합</span>
              <button
                type="button"
                onClick={clearSequenceCodes}
                className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300"
              >
                전체 비우기
              </button>
            </div>

            <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-3">
              <p className="text-xs font-medium text-zinc-400">근무 형태 선택</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {shiftTypes.map((shiftType) => (
                  <button
                    key={shiftType.id}
                    type="button"
                    onClick={() => appendSequenceCode(shiftType.code)}
                    className="flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-px hover:brightness-105"
                    style={{
                      borderColor: `${shiftType.color}99`,
                      backgroundColor: `${shiftType.color}3d`,
                      color: "var(--text-main)",
                      boxShadow: `inset 0 1px 0 ${shiftType.color}26`
                    }}
                    >
                      <span
                        className="inline-flex min-w-[30px] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black"
                        style={{ backgroundColor: shiftType.color, color: shiftType.text_color }}
                      >
                        {shiftType.code}
                      </span>
                      <span className="truncate">{shiftType.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-3">
            <p className="text-xs font-medium text-zinc-400">패턴 미리보기</p>
            {form.sequence_codes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.sequence_codes.map((code, index) => {
                  const shiftType = shiftTypeMap.get(code);

                  return (
                    <span
                      key={`${code}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs shadow-sm"
                      style={{
                        borderColor: `${(shiftType?.color ?? "#52525B")}99`,
                        backgroundColor: `${(shiftType?.color ?? "#52525B")}3d`,
                        color: "var(--text-main)",
                        boxShadow: `inset 0 1px 0 ${(shiftType?.color ?? "#52525B")}26`
                      }}
                    >
                      <span
                        className="inline-flex min-w-[30px] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black"
                        style={{
                          backgroundColor: shiftType?.color ?? "#52525B",
                          color: shiftType?.text_color ?? "#F4F4F5"
                        }}
                      >
                        {code}
                      </span>
                      <span>{shiftType?.name ?? "미등록 코드"}</span>
                      <button
                        type="button"
                        onClick={() => removeSequenceCodeAt(index)}
                        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-black/10 bg-black/10"
                        aria-label={`${code} 제거`}
                        title={`${code} 제거`}
                      >
                        <CloseIcon className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">근무 형태를 선택해서 패턴을 조합하세요.</p>
            )}
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-300">설명</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              placeholder="패턴의 의도나 사용 대상을 적어둡니다."
            />
          </label>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950"
            >
              {editingId ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
              {editingId ? "수정 저장" : "패턴 추가"}
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
          {patterns.map((pattern) => {
            const assignedCount = employees.filter((employee) =>
              employee.pattern_assignments.some((assignment) => assignment.pattern_id === pattern.id)
            ).length;

            return (
              <article key={pattern.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-50">{pattern.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">사이클 {pattern.sequence.length}일</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                    연결 직원 {assignedCount}명
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {pattern.sequence.map((code, index) => (
                    <span key={`${pattern.id}-${code}-${index}`} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200">
                      {code}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-300">{pattern.description || "설명 없음"}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(pattern)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-100"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pattern.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-200"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
