"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon, EditIcon, PlusIcon, TrashIcon } from "@/app/_services/components/icons";
import { useMockEmployees } from "@/app/_services/hooks/use-mock-employees";
import { useMockShiftPatterns } from "@/app/_services/hooks/use-mock-shift-patterns";
import { useMockShiftTypes } from "@/app/_services/hooks/use-mock-shift-types";
import {
  createMockEmployee,
  deleteMockEmployee,
  MockEmployee,
  MockEmployeeOverride,
  MockEmployeePatternAssignment,
  refreshMockEmployees,
  reorderMockEmployees,
  updateMockEmployee
} from "@/app/_services/utils/mock-employees";
import { FormEvent, useMemo, useState } from "react";

type EmployeeFormState = {
  name: string;
  team: string;
  role: string;
  color: string;
  weekly_hours: number;
};

type PatternAssignmentDraft = {
  pattern_id: string;
  effective_from: string;
  effective_to: string;
  pattern_anchor_date: string;
  pattern_offset: number;
};

type OverrideDraft = {
  date: string;
  shift_code: string;
  reason: string;
};

const EMPTY_EMPLOYEE_FORM: EmployeeFormState = {
  name: "",
  team: "",
  role: "",
  color: "#38BDF8",
  weekly_hours: 40
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createPatternDraft(defaultPatternId: string): PatternAssignmentDraft {
  return {
    pattern_id: defaultPatternId,
    effective_from: "2026-03-30",
    effective_to: "",
    pattern_anchor_date: "2026-03-30",
    pattern_offset: 0
  };
}

function createOverrideDraft(defaultShiftCode: string): OverrideDraft {
  return {
    date: "2026-04-08",
    shift_code: defaultShiftCode,
    reason: ""
  };
}

function toEmployeeFormState(item?: MockEmployee): EmployeeFormState {
  if (!item) {
    return { ...EMPTY_EMPLOYEE_FORM };
  }

  return {
    name: item.name,
    team: item.team,
    role: item.role,
    color: item.color,
    weekly_hours: item.weekly_hours
  };
}

function sortPatternAssignments(items: MockEmployeePatternAssignment[]) {
  return [...items].sort(
    (left, right) =>
      left.effective_from.localeCompare(right.effective_from) ||
      (left.effective_to ?? "9999-12-31").localeCompare(right.effective_to ?? "9999-12-31") ||
      left.id.localeCompare(right.id)
  );
}

function sortOverrides(items: MockEmployeeOverride[]) {
  return [...items].sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));
}

function formatEffectiveRange(item: MockEmployeePatternAssignment) {
  return `${item.effective_from} ~ ${item.effective_to ?? "계속"}`;
}

function formatOverrideSummary(item: MockEmployeeOverride, shiftName: string) {
  return `${item.date} · ${item.shift_code}(${shiftName})${item.reason ? ` · ${item.reason}` : ""}`;
}

function hasPatternOverlap(items: MockEmployeePatternAssignment[]) {
  const sorted = sortPatternAssignments(items);

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const previousEnd = previous.effective_to ?? "9999-12-31";

    if (previousEnd >= current.effective_from) {
      return true;
    }
  }

  return false;
}

export function MockEmployeeManager() {
  const employees = useMockEmployees();
  const patterns = useMockShiftPatterns();
  const shiftTypes = useMockShiftTypes();
  const defaultPatternId = patterns[0]?.id ?? "";
  const defaultShiftCode = shiftTypes.find((item) => item.code === "연차")?.code ?? shiftTypes[0]?.code ?? "OFF";
  const [form, setForm] = useState<EmployeeFormState>(EMPTY_EMPLOYEE_FORM);
  const [patternAssignments, setPatternAssignments] = useState<MockEmployeePatternAssignment[]>([]);
  const [assignmentDraft, setAssignmentDraft] = useState<PatternAssignmentDraft>(createPatternDraft(defaultPatternId));
  const [overrides, setOverrides] = useState<MockEmployeeOverride[]>([]);
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft>(createOverrideDraft(defaultShiftCode));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"info" | "success" | "error">("info");

  const patternNameMap = useMemo(
    () =>
      new Map(
        patterns.map((item) => [
          item.id,
          item.name
        ])
      ),
    [patterns]
  );

  const shiftNameMap = useMemo(
    () =>
      new Map(
        shiftTypes.map((item) => [
          item.code,
          item.name
        ])
      ),
    [shiftTypes]
  );

  const resetForm = () => {
    setForm({ ...EMPTY_EMPLOYEE_FORM });
    setPatternAssignments([]);
    setAssignmentDraft(createPatternDraft(defaultPatternId));
    setOverrides([]);
    setOverrideDraft(createOverrideDraft(defaultShiftCode));
    setEditingId(null);
  };

  const handleAddAssignment = () => {
    if (!assignmentDraft.effective_from || !assignmentDraft.pattern_anchor_date) {
      setMessage("패턴 적용 시작일과 기준일은 필수입니다.");
      setMessageKind("error");
      return;
    }

    if (assignmentDraft.effective_to && assignmentDraft.effective_to < assignmentDraft.effective_from) {
      setMessage("패턴 종료일은 시작일보다 빠를 수 없습니다.");
      setMessageKind("error");
      return;
    }

    const nextAssignments = sortPatternAssignments([
      ...patternAssignments,
      {
        id: createId("mock-employee-pattern-assignment"),
        pattern_id: assignmentDraft.pattern_id || null,
        effective_from: assignmentDraft.effective_from,
        effective_to: assignmentDraft.effective_to || null,
        pattern_anchor_date: assignmentDraft.pattern_anchor_date,
        pattern_offset: assignmentDraft.pattern_offset
      }
    ]);

    if (hasPatternOverlap(nextAssignments)) {
      setMessage("패턴 적용 기간이 겹칩니다. 중간 변경은 종료일과 시작일을 끊어서 등록하세요.");
      setMessageKind("error");
      return;
    }

    setPatternAssignments(nextAssignments);
    setAssignmentDraft(createPatternDraft(defaultPatternId));
    setMessage("패턴 적용 구간을 추가했습니다.");
    setMessageKind("success");
  };

  const handleRemoveAssignment = (id: string) => {
    setPatternAssignments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddOverride = () => {
    if (!overrideDraft.date || !overrideDraft.shift_code) {
      setMessage("오버라이드는 날짜와 근무 형태를 지정해야 합니다.");
      setMessageKind("error");
      return;
    }

    const nextOverride: MockEmployeeOverride = {
      id: createId("mock-employee-override"),
      date: overrideDraft.date,
      shift_code: overrideDraft.shift_code,
      reason: overrideDraft.reason.trim()
    };

    const nextOverrides = sortOverrides([
      ...overrides.filter((item) => item.date !== overrideDraft.date),
      nextOverride
    ]);

    setOverrides(nextOverrides);
    setOverrideDraft(createOverrideDraft(defaultShiftCode));
    setMessage("날짜별 오버라이드를 저장했습니다.");
    setMessageKind("success");
  };

  const handleRemoveOverride = (id: string) => {
    setOverrides((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const team = form.team.trim();
    const role = form.role.trim();

    if (!name || !team || !role) {
      setMessage("이름, 팀, 역할은 필수입니다.");
      setMessageKind("error");
      return;
    }

    if (hasPatternOverlap(patternAssignments)) {
      setMessage("패턴 적용 기간이 겹칩니다. 저장 전에 기간을 정리하세요.");
      setMessageKind("error");
      return;
    }

    const nextItem = {
      name,
      team,
      role,
      color: form.color,
      weekly_hours: form.weekly_hours,
      pattern_assignments: sortPatternAssignments(patternAssignments),
      overrides: sortOverrides(overrides)
    };

    try {
      if (editingId) {
        const currentEmployee = employees.find((item) => item.id === editingId);
        if (!currentEmployee) {
          throw new Error("수정할 직원을 찾을 수 없습니다.");
        }

        await updateMockEmployee(editingId, nextItem, shiftTypes, currentEmployee);
      } else {
        await createMockEmployee(nextItem, shiftTypes, employees);
      }

      resetForm();
      setMessage(editingId ? "직원 정보를 수정했습니다." : "직원을 추가했습니다.");
      setMessageKind("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 저장에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const startEdit = (item: MockEmployee) => {
    setEditingId(item.id);
    setForm(toEmployeeFormState(item));
    setPatternAssignments(sortPatternAssignments(item.pattern_assignments));
    setAssignmentDraft(createPatternDraft(defaultPatternId));
    setOverrides(sortOverrides(item.overrides));
    setOverrideDraft(createOverrideDraft(defaultShiftCode));
    setMessage(`${item.name} 직원 정보를 편집 중입니다.`);
    setMessageKind("info");
  };

  const handleDelete = async (id: string) => {
    const target = employees.find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (!window.confirm(`${target.name} 직원을 삭제할까요?`)) {
      return;
    }

    try {
      await deleteMockEmployee(id);

      if (editingId === id) {
        resetForm();
      }

      setMessage(`${target.name} 직원을 삭제했습니다.`);
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 삭제에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshMockEmployees(true);
      setMessage("직원 목록을 다시 불러왔습니다.");
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 새로고침에 실패했습니다.");
      setMessageKind("error");
    }
  };

  const handleMoveEmployee = async (id: string, direction: -1 | 1) => {
    const currentIndex = employees.findIndex((item) => item.id === id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= employees.length) {
      return;
    }

    const nextEmployees = [...employees];
    const [target] = nextEmployees.splice(currentIndex, 1);
    nextEmployees.splice(nextIndex, 0, target);

    try {
      await reorderMockEmployees(nextEmployees);
      setMessage(`${target.name} 직원 표시 순서를 ${direction < 0 ? "위" : "아래"}로 이동했습니다.`);
      setMessageKind("info");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직원 순서 변경에 실패했습니다.");
      setMessageKind("error");
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-black/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-zinc-300">직원을 등록하고, 기간별 패턴 변경과 날짜별 오버라이드를 같이 관리합니다.</p>
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

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">{editingId ? "직원 수정" : "직원 추가"}</p>
              <p className="mt-1 text-xs text-zinc-400">중간 패턴 변경과 연차 같은 날짜 예외를 한 곳에서 편집합니다.</p>
            </div>
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: form.color }}
            >
              {form.name.trim().slice(0, 1) || "?"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">이름</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                placeholder="예: 김하늘"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">팀</span>
              <input
                value={form.team}
                onChange={(event) => setForm((prev) => ({ ...prev, team: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                placeholder="예: 프론트"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">역할</span>
              <input
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
                placeholder="예: 매니저"
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">주간 시간</span>
              <input
                type="number"
                min={1}
                max={80}
                value={form.weekly_hours}
                onChange={(event) => setForm((prev) => ({ ...prev, weekly_hours: Number(event.target.value) || 0 }))}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50"
              />
            </label>
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-zinc-300">대표 색상</span>
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 p-1"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/60 p-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">기간별 패턴 배정</p>
              <p className="mt-1 text-xs text-zinc-400">패턴이 중간에 바뀌면 날짜 구간을 나눠서 여러 개 등록합니다.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">반복 패턴</span>
                <select
                  value={assignmentDraft.pattern_id}
                  onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, pattern_id: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                >
                  <option value="">패턴 미지정</option>
                  {patterns.map((pattern) => (
                    <option key={pattern.id} value={pattern.id}>
                      {pattern.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">패턴 기준일</span>
                <input
                  type="date"
                  value={assignmentDraft.pattern_anchor_date}
                  onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, pattern_anchor_date: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">적용 시작일</span>
                <input
                  type="date"
                  value={assignmentDraft.effective_from}
                  onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, effective_from: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">적용 종료일</span>
                <input
                  type="date"
                  value={assignmentDraft.effective_to}
                  onChange={(event) => setAssignmentDraft((prev) => ({ ...prev, effective_to: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-300">offset</span>
                <input
                  type="number"
                  min={-30}
                  max={30}
                  value={assignmentDraft.pattern_offset}
                  onChange={(event) =>
                    setAssignmentDraft((prev) => ({ ...prev, pattern_offset: Number(event.target.value) || 0 }))
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleAddAssignment}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-950/20 px-3 py-2 text-sm font-semibold text-cyan-100"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              패턴 구간 추가
            </button>

            <div className="space-y-2">
              {patternAssignments.length > 0 ? (
                patternAssignments.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.pattern_id ? patternNameMap.get(item.pattern_id) ?? "삭제된 패턴" : "패턴 미지정"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{formatEffectiveRange(item)}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        기준일 {item.pattern_anchor_date} · offset {item.pattern_offset}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/30 text-rose-200"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-700 px-3 py-4 text-xs text-zinc-500">
                  아직 등록된 패턴 구간이 없습니다. 패턴이 중간에 바뀌는 경우 날짜를 끊어서 여러 번 추가하세요.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/60 p-3">
            <div>
              <p className="text-sm font-semibold text-zinc-50">날짜별 오버라이드</p>
              <p className="mt-1 text-xs text-zinc-400">연차, 교육, 교대 변경처럼 특정 날짜만 예외 처리합니다.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">날짜</span>
                <input
                  type="date"
                  value={overrideDraft.date}
                  onChange={(event) => setOverrideDraft((prev) => ({ ...prev, date: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-300">근무 형태</span>
                <select
                  value={overrideDraft.shift_code}
                  onChange={(event) => setOverrideDraft((prev) => ({ ...prev, shift_code: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                >
                  {shiftTypes.map((shiftType) => (
                    <option key={shiftType.id} value={shiftType.code}>
                      {shiftType.code} · {shiftType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-zinc-300">사유</span>
                <input
                  value={overrideDraft.reason}
                  onChange={(event) => setOverrideDraft((prev) => ({ ...prev, reason: event.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                  placeholder="예: 개인 연차, 교육, 교대 변경"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleAddOverride}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-950/20 px-3 py-2 text-sm font-semibold text-cyan-100"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              오버라이드 추가
            </button>

            <div className="space-y-2">
              {overrides.length > 0 ? (
                overrides.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100">
                        {item.shift_code} · {shiftNameMap.get(item.shift_code) ?? "삭제된 근무 형태"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{item.date}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{item.reason || "사유 없음"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOverride(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/30 text-rose-200"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-700 px-3 py-4 text-xs text-zinc-500">
                  등록된 날짜별 오버라이드가 없습니다. 근무일을 연차로 바꾸는 경우 여기서 추가합니다.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950"
            >
              {editingId ? <CheckIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
              {editingId ? "수정 저장" : "직원 추가"}
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
          {employees.map((employee, index) => (
            <article key={employee.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: employee.color }}
                  >
                    {employee.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-50">{employee.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {employee.team} · {employee.role}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                    순서 {index + 1}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                    주 {employee.weekly_hours}h
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">패턴 배정</p>
                  <div className="mt-2 space-y-2 text-xs text-zinc-300">
                    {employee.pattern_assignments.length > 0 ? (
                      employee.pattern_assignments.map((item) => (
                        <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                          <p className="font-medium text-zinc-100">
                            {item.pattern_id ? patternNameMap.get(item.pattern_id) ?? "삭제된 패턴" : "패턴 미지정"}
                          </p>
                          <p className="mt-1 text-zinc-400">{formatEffectiveRange(item)}</p>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            기준일 {item.pattern_anchor_date} · offset {item.pattern_offset}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500">등록된 패턴 배정이 없습니다.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <p className="text-[11px] font-semibold tracking-[0.18em] text-zinc-500 uppercase">오버라이드</p>
                  <div className="mt-2 space-y-2 text-xs text-zinc-300">
                    {employee.overrides.length > 0 ? (
                      employee.overrides.map((item) => (
                        <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                          {formatOverrideSummary(item, shiftNameMap.get(item.shift_code) ?? "삭제된 근무 형태")}
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500">등록된 날짜별 오버라이드가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleMoveEmployee(employee.id, -1)}
                  disabled={index === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-600 px-2 py-2 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
                  title="위로 이동"
                >
                  <ChevronUpIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveEmployee(employee.id, 1)}
                  disabled={index === employees.length - 1}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-600 px-2 py-2 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
                  title="아래로 이동"
                >
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(employee)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-sm text-cyan-100"
                >
                  <EditIcon className="h-3.5 w-3.5" />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee.id)}
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
