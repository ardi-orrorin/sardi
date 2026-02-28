"use client";

import { FetchBuilder } from "@/app/_commons/utils/func";
import { NumberDropdown } from "@/app/_services/components/number-dropdown";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ShiftType = {
  id: string;
  name: string;
  start_offset: string;
  duration: string;
  all_day: boolean;
};

type PatternStepDraft = {
  local_id: string;
  step_order: number;
  day_offset: number;
  schedule_type_id: string;
};

type PatternStep = {
  id: string;
  step_order: number;
  day_offset: number;
  schedule_type_id: string;
  schedule_type_name: string;
  start_offset: string;
  duration: string;
  all_day: boolean;
};

type Pattern = {
  id: string;
  name: string;
  cycle_days: number;
  steps: PatternStep[];
};

const createStepLocalId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `step-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeStepOrder = (steps: PatternStepDraft[]) =>
  steps.map((item, index) => ({
    ...item,
    step_order: index
  }));

type StepDropdownOption = {
  value: string;
  label: string;
};

type StepDropdownProps = {
  options: StepDropdownOption[];
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
};

type IconProps = {
  className?: string;
};

function EditIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function LogoutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function StepDropdown({ options, value, onChange, placeholder }: StepDropdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-teal-100/20 bg-teal-950/30 px-2 py-2 text-sm text-teal-50"
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <span className="ml-2 text-[11px] text-teal-100/70">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-teal-100/20 bg-[#042325] p-1 shadow-xl">
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
              className={`w-full rounded-md px-2 py-2 text-left text-sm text-teal-50 hover:bg-black/25 ${
                item.value === value ? "bg-black/30" : ""
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type SortablePatternStepItemProps = {
  step: PatternStepDraft;
  index: number;
  shiftTypes: ShiftType[];
  canDelete: boolean;
  onUpdateStep: (localId: string, key: "day_offset" | "schedule_type_id", value: string) => void;
  onRemoveStep: (localId: string) => void;
};

function SortablePatternStepItem({
  step,
  index,
  shiftTypes,
  canDelete,
  onUpdateStep,
  onRemoveStep
}: SortablePatternStepItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.local_id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[44px_minmax(172px,196px)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-teal-100/15 bg-black/20 p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="rounded-md border border-teal-200/30 px-2 py-2 text-[11px] text-teal-100/80 touch-none"
      >
        #{index + 1}
      </button>
      <NumberDropdown
        value={step.day_offset}
        min={0}
        max={365}
        tone="teal"
        className="min-w-[172px]"
        onChange={(nextValue) => onUpdateStep(step.local_id, "day_offset", String(nextValue))}
      />
      <StepDropdown
        options={shiftTypes.map((item) => ({
          value: item.id,
          label: item.name
        }))}
        value={step.schedule_type_id}
        onChange={(nextValue) => onUpdateStep(step.local_id, "schedule_type_id", nextValue)}
        placeholder="근무타입 선택"
      />
      <button
        type="button"
        disabled={!canDelete}
        onClick={() => onRemoveStep(step.local_id)}
        className="rounded-lg border border-rose-300/40 px-2 py-2 text-xs text-rose-200 disabled:opacity-40"
      >
        삭제
      </button>
    </div>
  );
}

export default function ShiftSettings() {
  const router = useRouter();

  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);

  const [shiftTypeForm, setShiftTypeForm] = useState({
    name: "",
    start_offset: "09:00:00",
    duration: "08:00:00",
    all_day: false
  });
  const [editingShiftTypeId, setEditingShiftTypeId] = useState<string | null>(null);

  const [patternForm, setPatternForm] = useState({
    name: "",
    steps: [
      {
        local_id: createStepLocalId(),
        step_order: 0,
        day_offset: 0,
        schedule_type_id: ""
      }
    ] as PatternStepDraft[]
  });
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);

  const autoCycleDays = useMemo(() => {
    const maxOffset = patternForm.steps.reduce((acc, item) => Math.max(acc, item.day_offset), 0);
    return Math.max(maxOffset + 1, 1);
  }, [patternForm.steps]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 6
      }
    })
  );

  const loadShiftTypes = useCallback(async () => {
    const payload = await FetchBuilder.get().url("/api/sardi/shift-types").execute<ShiftType[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "근무 타입 조회 실패");
    }

    setShiftTypes(payload);

    setPatternForm((prev) => {
      if (prev.steps[0]?.schedule_type_id || payload.length === 0) {
        return prev;
      }

      return {
        ...prev,
        steps: prev.steps.map((step, index) => ({
          ...step,
          step_order: index,
          schedule_type_id: payload[0].id
        }))
      };
    });
  }, []);

  const loadPatterns = useCallback(async () => {
    const payload = await FetchBuilder.get().url("/api/sardi/patterns").execute<Pattern[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "패턴 조회 실패");
    }

    setPatterns(payload);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      await Promise.all([loadShiftTypes(), loadPatterns()]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "초기 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [loadPatterns, loadShiftTypes]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleLogout = async () => {
    await FetchBuilder.post().url("/api/auth/logout").execute();
    router.replace("/login");
  };

  const resetShiftTypeForm = useCallback(() => {
    setShiftTypeForm({
      name: "",
      start_offset: "09:00:00",
      duration: "08:00:00",
      all_day: false
    });
    setEditingShiftTypeId(null);
  }, []);

  const handleSubmitShiftType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatusMessage("");

    try {
      const payload = editingShiftTypeId
        ? await FetchBuilder.patch()
            .url(`/api/sardi/shift-types/${encodeURIComponent(editingShiftTypeId)}`)
            .body(shiftTypeForm)
            .execute<{ id?: string; error?: string }>()
        : await FetchBuilder.post()
            .url("/api/sardi/shift-types")
            .body(shiftTypeForm)
            .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? (editingShiftTypeId ? "근무 타입 수정 실패" : "근무 타입 생성 실패"));
      }

      resetShiftTypeForm();
      await Promise.all([loadShiftTypes(), loadPatterns()]);
      setStatusMessage(editingShiftTypeId ? "근무 타입을 수정했습니다." : "근무 타입이 등록되었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "근무 타입 저장 실패");
    }
  };

  const startEditShiftType = (item: ShiftType) => {
    setEditingShiftTypeId(item.id);
    setShiftTypeForm({
      name: item.name,
      start_offset: item.start_offset,
      duration: item.duration,
      all_day: item.all_day
    });
  };

  const handleDeleteShiftType = async (id: string) => {
    if (!window.confirm("이 근무 타입을 삭제할까요? 관련 패턴/일정이 있으면 삭제되지 않습니다.")) {
      return;
    }

    setStatusMessage("");

    try {
      const payload = await FetchBuilder.delete()
        .url(`/api/sardi/shift-types/${encodeURIComponent(id)}`)
        .execute<{ deleted?: boolean; error?: string }>();

      if (!payload.deleted) {
        throw new Error(payload.error ?? "근무 타입 삭제 실패");
      }

      if (editingShiftTypeId === id) {
        resetShiftTypeForm();
      }

      await Promise.all([loadShiftTypes(), loadPatterns()]);
      setStatusMessage("근무 타입을 삭제했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "근무 타입 삭제 실패");
    }
  };

  const appendPatternStep = () => {
    setPatternForm((prev) => ({
      ...prev,
      steps: normalizeStepOrder([
        ...prev.steps,
        {
          local_id: createStepLocalId(),
          step_order: prev.steps.length,
          day_offset: prev.steps.length,
          schedule_type_id: prev.steps[0]?.schedule_type_id ?? ""
        }
      ])
    }));
  };

  const removePatternStep = (targetId: string) => {
    setPatternForm((prev) => {
      if (prev.steps.length <= 1) {
        return prev;
      }

      const next = normalizeStepOrder(prev.steps.filter((item) => item.local_id !== targetId));

      return {
        ...prev,
        steps: next
      };
    });
  };

  const updatePatternStep = (targetId: string, key: "day_offset" | "schedule_type_id", value: string) => {
    setPatternForm((prev) => ({
      ...prev,
      steps: prev.steps.map((item) => {
        if (item.local_id !== targetId) {
          return item;
        }

        if (key === "day_offset") {
          return { ...item, day_offset: Number(value) };
        }

        return { ...item, schedule_type_id: value };
      })
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    setPatternForm((prev) => {
      const oldIndex = prev.steps.findIndex((item) => item.local_id === active.id);
      const newIndex = prev.steps.findIndex((item) => item.local_id === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return prev;
      }

      const reordered = arrayMove(prev.steps, oldIndex, newIndex);
      return {
        ...prev,
        steps: normalizeStepOrder(reordered)
      };
    });
  };

  const resetPatternForm = useCallback(
    (defaultShiftTypeId: string) => {
      setPatternForm({
        name: "",
        steps: [
          {
            local_id: createStepLocalId(),
            step_order: 0,
            day_offset: 0,
            schedule_type_id: defaultShiftTypeId
          }
        ]
      });
      setEditingPatternId(null);
    },
    []
  );

  const startEditPattern = (pattern: Pattern) => {
    const sortedSteps = pattern.steps.slice().sort((a, b) => a.step_order - b.step_order);
    setEditingPatternId(pattern.id);
    setPatternForm({
      name: pattern.name,
      steps: normalizeStepOrder(
        sortedSteps.map((item) => ({
          local_id: createStepLocalId(),
          step_order: item.step_order,
          day_offset: item.day_offset,
          schedule_type_id: item.schedule_type_id
        }))
      )
    });
  };

  const handleDeletePattern = async (id: string) => {
    if (!window.confirm("이 패턴을 삭제할까요?")) {
      return;
    }

    setStatusMessage("");

    try {
      const payload = await FetchBuilder.delete()
        .url(`/api/sardi/patterns/${encodeURIComponent(id)}`)
        .execute<{ deleted?: boolean; error?: string }>();

      if (!payload.deleted) {
        throw new Error(payload.error ?? "패턴 삭제 실패");
      }

      if (editingPatternId === id) {
        resetPatternForm(shiftTypes[0]?.id ?? "");
      }

      await loadPatterns();
      setStatusMessage("패턴을 삭제했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "패턴 삭제 실패");
    }
  };

  const handleSubmitPattern = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patternForm.name.trim()) {
      setStatusMessage("패턴 이름을 입력하세요.");
      return;
    }

    if (patternForm.steps.some((step) => !step.schedule_type_id)) {
      setStatusMessage("스텝마다 근무 타입을 선택하세요.");
      return;
    }

    setStatusMessage("");

    try {
      const payload = editingPatternId
        ? await FetchBuilder.patch()
            .url(`/api/sardi/patterns/${encodeURIComponent(editingPatternId)}`)
            .body({
              name: patternForm.name,
              cycle_days: autoCycleDays,
              steps: normalizeStepOrder(patternForm.steps).map((item) => ({
                step_order: item.step_order,
                day_offset: item.day_offset,
                schedule_type_id: item.schedule_type_id
              }))
            })
            .execute<{ id?: string; error?: string }>()
        : await FetchBuilder.post()
            .url("/api/sardi/patterns")
            .body({
              name: patternForm.name,
              cycle_days: autoCycleDays,
              steps: normalizeStepOrder(patternForm.steps).map((item) => ({
                step_order: item.step_order,
                day_offset: item.day_offset,
                schedule_type_id: item.schedule_type_id
              }))
            })
            .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? (editingPatternId ? "패턴 수정 실패" : "패턴 생성 실패"));
      }

      resetPatternForm(shiftTypes[0]?.id ?? "");
      await loadPatterns();
      setStatusMessage(editingPatternId ? "패턴을 수정했습니다." : "패턴이 등록되었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "패턴 저장 실패");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-black/30 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">SARDI</p>
          <h1 className="text-lg font-bold leading-tight">근무 타입/패턴 설정</h1>
        </div>
        <div className="grid w-full grid-cols-4 gap-2 md:flex md:w-auto md:flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-300/40 px-2 py-2 text-[13px] font-semibold text-cyan-100 md:px-3 md:py-1 md:text-sm"
          >
            스케줄
          </Link>
          <Link
            href="/settings/labels"
            className="inline-flex items-center justify-center rounded-lg border border-cyan-300/40 px-2 py-2 text-[13px] font-semibold text-cyan-100 md:px-3 md:py-1 md:text-sm"
          >
            라벨 설정
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
            aria-label="로그아웃"
            title="로그아웃"
            className="inline-flex items-center justify-center rounded-lg border border-rose-300/40 px-2 py-2 text-rose-200 md:px-3 md:py-1"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="sr-only">로그아웃</span>
          </button>
        </div>
      </header>

      {statusMessage ? (
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <form onSubmit={handleSubmitShiftType} className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">{editingShiftTypeId ? "근무 타입 수정" : "근무 타입 등록"}</h2>
          <input
            value={shiftTypeForm.name}
            onChange={(event) => setShiftTypeForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="예: 주간"
            className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={shiftTypeForm.start_offset}
              onChange={(event) => setShiftTypeForm((prev) => ({ ...prev, start_offset: event.target.value }))}
              placeholder="09:00:00"
              className="rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              required
            />
            <input
              value={shiftTypeForm.duration}
              onChange={(event) => setShiftTypeForm((prev) => ({ ...prev, duration: event.target.value }))}
              placeholder="08:00:00"
              className="rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-teal-100/80">
            <input
              type="checkbox"
              checked={shiftTypeForm.all_day}
              onChange={(event) => setShiftTypeForm((prev) => ({ ...prev, all_day: event.target.checked }))}
            />
            종일 일정
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" className="w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950">
              {editingShiftTypeId ? "수정 저장" : "등록"}
            </button>
            <button
              type="button"
              onClick={resetShiftTypeForm}
              className="w-full rounded-lg border border-teal-300/40 px-3 py-2 text-sm text-teal-100"
              disabled={!editingShiftTypeId}
            >
              편집 취소
            </button>
          </div>

          <div className="rounded-lg border border-teal-100/15 bg-teal-900/10 p-3">
            <p className="mb-2 text-xs text-teal-100/75">등록된 근무 타입 {shiftTypes.length}개</p>
            <ul className="space-y-1 text-xs text-teal-100/90">
              {shiftTypes.map((item) => (
                <li key={item.id} className="space-y-1 rounded bg-black/20 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-teal-100/60">
                      {item.start_offset} / {item.duration}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditShiftType(item)}
                      aria-label="근무 타입 수정"
                      title="근무 타입 수정"
                      className="inline-flex min-h-[44px] items-center justify-center rounded border border-teal-300/40 px-2 py-2 text-teal-100"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteShiftType(item.id)}
                      aria-label="근무 타입 삭제"
                      title="근무 타입 삭제"
                      className="inline-flex min-h-[44px] items-center justify-center rounded border border-rose-300/40 px-2 py-2 text-rose-200"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>

        <form onSubmit={handleSubmitPattern} className="space-y-3 rounded-2xl border border-teal-300/20 bg-black/30 p-4">
          <h2 className="text-sm font-semibold">{editingPatternId ? "패턴 + 스텝 수정" : "패턴 + 스텝 등록"}</h2>
          <input
            value={patternForm.name}
            onChange={(event) => setPatternForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="예: 주주야야휴휴"
            className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
            required
          />
          <p className="rounded-lg border border-teal-100/15 bg-teal-950/20 px-3 py-2 text-xs text-teal-100/80">
            cycle_days 자동 계산: {autoCycleDays}일 (스텝 오프셋 기준)
          </p>

          <div className="space-y-2">
            <p className="text-[11px] text-teal-100/70">좌측 핸들(`#번호`)을 드래그해서 스텝 순서를 변경하세요.</p>
            <div className="grid grid-cols-[44px_minmax(172px,196px)_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-teal-100/15 bg-teal-950/20 px-2 py-2 text-[11px] font-semibold text-teal-100/80">
              <span className="text-center">스텝</span>
              <span>offset_day</span>
              <span>근무 타입</span>
              <span className="text-center">삭제</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={patternForm.steps.map((item) => item.local_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {patternForm.steps.map((step, index) => (
                    <SortablePatternStepItem
                      key={step.local_id}
                      step={step}
                      index={index}
                      shiftTypes={shiftTypes}
                      canDelete={patternForm.steps.length > 1}
                      onUpdateStep={updatePatternStep}
                      onRemoveStep={removePatternStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={appendPatternStep}
              className="w-full rounded-lg border border-teal-300/40 px-3 py-2 text-xs text-teal-100"
            >
              스텝 추가
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="submit" className="w-full rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950">
              {editingPatternId ? "수정 저장" : "저장"}
            </button>
            <button
              type="button"
              onClick={() => resetPatternForm(shiftTypes[0]?.id ?? "")}
              className="w-full rounded-lg border border-teal-300/40 px-3 py-2 text-sm text-teal-100"
              disabled={!editingPatternId}
            >
              편집 취소
            </button>
          </div>

          <div className="rounded-lg border border-teal-100/15 bg-teal-900/10 p-3">
            <p className="mb-2 text-xs text-teal-100/75">등록된 패턴 {patterns.length}개</p>
            <ul className="space-y-1 text-xs text-teal-100/90">
              {patterns.map((pattern) => (
                <li key={pattern.id} className="space-y-1 rounded bg-black/20 px-2 py-2">
                  <p className="font-semibold">
                    {pattern.name} ({pattern.cycle_days}일)
                  </p>
                  <p className="text-teal-100/65">
                    {pattern.steps
                      .slice()
                      .sort((a, b) => a.step_order - b.step_order)
                      .map((step) => `${step.day_offset}일:${step.schedule_type_name}`)
                      .join(" / ")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditPattern(pattern)}
                      aria-label="패턴 수정"
                      title="패턴 수정"
                      className="inline-flex min-h-[44px] items-center justify-center rounded border border-teal-300/40 px-2 py-2 text-teal-100"
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeletePattern(pattern.id)}
                      aria-label="패턴 삭제"
                      title="패턴 삭제"
                      className="inline-flex min-h-[44px] items-center justify-center rounded border border-rose-300/40 px-2 py-2 text-rose-200"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </section>

      {loading ? <p className="text-xs text-cyan-100/70">로딩 중...</p> : null}
    </div>
  );
}
