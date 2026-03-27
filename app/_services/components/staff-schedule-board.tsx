"use client";

import { CalendarDayIcon, CheckIcon, ChevronDownIcon, CloseIcon, DragHandleIcon, TrashIcon } from "@/app/_services/components/icons";
import { useMockCompanyEvents } from "@/app/_services/hooks/use-mock-company-events";
import { useMockEmployees } from "@/app/_services/hooks/use-mock-employees";
import { useMockShiftPatterns } from "@/app/_services/hooks/use-mock-shift-patterns";
import { useMockShiftTypes } from "@/app/_services/hooks/use-mock-shift-types";
import {
  expandMockCompanyEventOccurrences,
  MockCompanyEvent,
  MockCompanyEventOccurrence
} from "@/app/_services/utils/mock-company-events";
import {
  deleteMockEmployeeOverride,
  MockEmployee,
  MockEmployeeOverride,
  MockEmployeePatternAssignment,
  reorderMockEmployees,
  upsertMockEmployeeOverride
} from "@/app/_services/utils/mock-employees";
import { MockShiftPattern } from "@/app/_services/utils/mock-shift-patterns";
import { MockShiftType } from "@/app/_services/utils/mock-shift-types";
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ViewMode = "day" | "week" | "month";

type ScheduleSummary = {
  total_employees: number;
  scheduled_shifts: number;
  open_slots: number;
  overtime_employees: number;
};

type WeekDay = {
  date: string;
  label: string;
  display: string;
  tone: "weekday" | "sat" | "sun";
  is_today?: boolean;
  is_weekend?: boolean;
};

type MonthDay = {
  date: string;
  label: string;
  display: string;
  tone: "weekday" | "sat" | "sun";
  is_today?: boolean;
};

type ResolvedAssignment = {
  date: string;
  shift_code: string;
  pattern_name: string;
  cycle_index: number;
  cycle_length: number;
  source_kind: "pattern" | "override" | "none";
  source_note: string;
  effective_range: string | null;
  base_pattern_name: string | null;
};

type OverrideModalTarget = {
  employee_id: string;
  employee_name: string;
  date: string;
  current_shift_code: string;
  current_shift_name: string;
  assignment_note: string;
  existing_override: MockEmployeeOverride | null;
};

const VIEW_TABS: Array<{ id: ViewMode; label: string }> = [
  { id: "day", label: "일" },
  { id: "week", label: "주" },
  { id: "month", label: "월" }
];

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(value: string, days: number) {
  const next = parseDate(value);
  next.setDate(next.getDate() + days);
  return formatDateKey(next);
}

function addMonthsToDateKey(value: string, months: number) {
  const next = parseDate(value);
  next.setMonth(next.getMonth() + months);
  return formatDateKey(next);
}

function formatDayPeriodLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(parseDate(value));
}

function formatMonthPeriodLabel(value: string) {
  const date = parseDate(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function formatShortPeriodDate(value: string) {
  const date = parseDate(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function buildWeekDays(centerDate: string): WeekDay[] {
  const date = parseDate(centerDate);
  const dayOfWeek = date.getDay();
  const diffToSunday = dayOfWeek;
  const start = parseDate(centerDate);
  start.setDate(date.getDate() - diffToSunday);
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const currentKey = formatDateKey(current);
    const currentDay = current.getDay();

    return {
      date: currentKey,
      label: WEEKDAY_LABELS[currentDay],
      display: `${current.getMonth() + 1}/${current.getDate()}`,
      tone: currentDay === 6 ? "sat" : currentDay === 0 ? "sun" : "weekday",
      is_today: currentKey === todayKey,
      is_weekend: currentDay === 0 || currentDay === 6
    };
  });
}

function buildMonthDays(centerDate: string): MonthDay[] {
  const date = parseDate(centerDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: totalDays }, (_, index) => {
    const current = new Date(year, month, index + 1, 12);
    const currentDay = current.getDay();
    const currentKey = formatDateKey(current);

    return {
      date: currentKey,
      label: WEEKDAY_LABELS[currentDay],
      display: String(index + 1),
      tone: currentDay === 6 ? "sat" : currentDay === 0 ? "sun" : "weekday",
      is_today: currentKey === todayKey
    };
  });
}

function diffDays(startDate: string, endDate: string) {
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function fallbackShift(code: string): MockShiftType {
  return {
    id: `fallback-${code}`,
    code,
    name: code,
    category: "미정",
    description: "등록되지 않은 근무 코드",
    start: "",
    end: "",
    color: "#52525B",
    text_color: "#F4F4F5",
    all_day: true
  };
}

function resolveShift(code: string, shiftMap: Map<string, MockShiftType>) {
  return shiftMap.get(code) ?? fallbackShift(code);
}

function describeShiftTime(shift: MockShiftType) {
  if (shift.all_day || !shift.start || !shift.end) {
    return "종일 또는 시간 미정";
  }

  return `${shift.start} - ${shift.end}`;
}

function getMonthToneClass(tone: MonthDay["tone"]) {
  if (tone === "sat") {
    return "bg-sky-100 dark:bg-sky-950/35";
  }

  if (tone === "sun") {
    return "bg-rose-100 dark:bg-rose-950/35";
  }

  return "bg-white dark:bg-zinc-950/75";
}

function getMonthToneBorderClass(tone: MonthDay["tone"]) {
  if (tone === "sat") {
    return "border-sky-200 dark:border-sky-400/20";
  }

  if (tone === "sun") {
    return "border-rose-200 dark:border-rose-400/20";
  }

  return "border-slate-200 dark:border-zinc-800/80";
}

function getTodayAccentClass(isToday?: boolean) {
  return isToday ? "ring-1 ring-cyan-500/45 dark:ring-cyan-300/55 ring-inset" : "";
}

function getTodayColumnClass(isToday?: boolean) {
  return isToday ? "ring-1 ring-cyan-500/35 dark:ring-cyan-300/40 ring-inset" : "";
}

function getDayTitleClass(tone: MonthDay["tone"], isToday?: boolean) {
  if (isToday) {
    return "text-cyan-200";
  }

  if (tone === "sat") {
    return "text-sky-500 dark:text-sky-200";
  }

  if (tone === "sun") {
    return "text-rose-500 dark:text-rose-200";
  }

  return "text-zinc-300";
}

function getDayDisplayClass(tone: MonthDay["tone"], isToday?: boolean) {
  if (isToday) {
    return "text-cyan-50";
  }

  if (tone === "sat") {
    return "text-sky-700 dark:text-sky-100";
  }

  if (tone === "sun") {
    return "text-rose-700 dark:text-rose-100";
  }

  return "text-zinc-50";
}

function eventIncludesDate(companyEvent: MockCompanyEventOccurrence, date: string) {
  return companyEvent.occurrence_start_date <= date && date <= companyEvent.occurrence_end_date;
}

function getEventsByDate<TDay extends { date: string }>(days: TDay[], companyEvents: MockCompanyEventOccurrence[]) {
  return new Map(
    days.map((day) => [
      day.date,
      companyEvents.filter((companyEvent) => eventIncludesDate(companyEvent, day.date))
    ])
  );
}

function calculateShiftHours(shift: MockShiftType) {
  if (shift.all_day || !shift.start || !shift.end) {
    return 0;
  }

  const [startHour, startMinute] = shift.start.split(":").map(Number);
  const [endHour, endMinute] = shift.end.split(":").map(Number);

  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end <= start) {
    end += 24 * 60;
  }

  return (end - start) / 60;
}

function summarizeAssignments(employees: MockEmployee[], assignments: ResolvedAssignment[], shiftMap: Map<string, MockShiftType>): ScheduleSummary {
  return {
    total_employees: employees.length,
    scheduled_shifts: assignments.filter((assignment) => {
      const shift = resolveShift(assignment.shift_code, shiftMap);
      return assignment.shift_code !== "OPEN" && !shift.all_day;
    }).length,
    open_slots: assignments.filter((assignment) => assignment.shift_code === "OPEN").length,
    overtime_employees: employees.filter((employee) => employee.weekly_hours > 40).length
  };
}

function formatAssignmentRange(assignment: Pick<MockEmployeePatternAssignment, "effective_from" | "effective_to">) {
  return `${assignment.effective_from} ~ ${assignment.effective_to ?? "계속"}`;
}

function findOverride(employee: MockEmployee, date: string): MockEmployeeOverride | null {
  return employee.overrides.find((item) => item.date === date) ?? null;
}

function findActivePatternAssignment(employee: MockEmployee, date: string): MockEmployeePatternAssignment | null {
  const activeAssignments = employee.pattern_assignments
    .filter((item) => item.effective_from <= date && (item.effective_to === null || date <= item.effective_to))
    .sort(
      (left, right) =>
        right.effective_from.localeCompare(left.effective_from) ||
        (right.effective_to ?? "9999-12-31").localeCompare(left.effective_to ?? "9999-12-31") ||
        right.id.localeCompare(left.id)
    );

  return activeAssignments[0] ?? null;
}

function resolveAssignment(
  employee: MockEmployee,
  date: string,
  patternMap: Map<string, MockShiftPattern>
): ResolvedAssignment {
  const activePatternAssignment = findActivePatternAssignment(employee, date);
  const pattern = activePatternAssignment?.pattern_id ? patternMap.get(activePatternAssignment.pattern_id) : null;
  const override = findOverride(employee, date);

  if (override) {
    return {
      date,
      shift_code: override.shift_code,
      pattern_name: "날짜 스케줄 변경",
      cycle_index: 0,
      cycle_length: 0,
      source_kind: "override",
      source_note: override.reason || "사유 없음",
      effective_range: activePatternAssignment ? formatAssignmentRange(activePatternAssignment) : null,
      base_pattern_name: pattern?.name ?? null
    };
  }

  if (!activePatternAssignment || !pattern || pattern.sequence.length === 0) {
    return {
      date,
      shift_code: "OFF",
      pattern_name: "패턴 미지정",
      cycle_index: 0,
      cycle_length: 0,
      source_kind: "none",
      source_note: "적용된 반복 패턴이 없습니다.",
      effective_range: null,
      base_pattern_name: null
    };
  }

  const dayIndex = diffDays(activePatternAssignment.pattern_anchor_date, date) + activePatternAssignment.pattern_offset;
  const cycleIndex = mod(dayIndex, pattern.sequence.length);

  return {
    date,
    shift_code: pattern.sequence[cycleIndex],
    pattern_name: pattern.name,
    cycle_index: cycleIndex,
    cycle_length: pattern.sequence.length,
    source_kind: "pattern",
    source_note: "",
    effective_range: formatAssignmentRange(activePatternAssignment),
    base_pattern_name: null
  };
}

function formatCycleNote(assignment: ResolvedAssignment) {
  if (assignment.source_kind === "override") {
    return `스케줄 변경 · ${assignment.source_note}`;
  }

  if (assignment.source_kind === "none" || assignment.cycle_length === 0) {
    return "패턴이 연결되지 않았습니다.";
  }

  return `${assignment.pattern_name} · ${assignment.cycle_index + 1}/${assignment.cycle_length}일차`;
}

function formatAssignmentContext(assignment: ResolvedAssignment) {
  if (assignment.source_kind === "override") {
    if (assignment.base_pattern_name && assignment.effective_range) {
      return `기본 패턴 ${assignment.base_pattern_name} · ${assignment.effective_range}`;
    }

    if (assignment.effective_range) {
      return `기본 패턴 구간 ${assignment.effective_range}`;
    }

    return "기본 패턴 없이 직접 지정";
  }

  if (assignment.source_kind === "pattern" && assignment.effective_range) {
    return `적용 구간 ${assignment.effective_range}`;
  }

  return "";
}

function reorderEmployeesById(employees: MockEmployee[], sourceId: string, targetId: string) {
  const sourceIndex = employees.findIndex((item) => item.id === sourceId);
  const targetIndex = employees.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return employees;
  }

  const nextEmployees = [...employees];
  const [movedEmployee] = nextEmployees.splice(sourceIndex, 1);
  nextEmployees.splice(targetIndex, 0, movedEmployee);
  return nextEmployees;
}

function describeEventRepeat(companyEvent: Pick<MockCompanyEvent, "repeat_count" | "repeat_interval_days">) {
  if (companyEvent.repeat_count <= 1) {
    return "단일 이벤트";
  }

  return `${companyEvent.repeat_interval_days}일 간격 · ${companyEvent.repeat_count}회 반복`;
}

function formatOccurrenceLabel(companyEvent: MockCompanyEventOccurrence) {
  if (companyEvent.repeat_count <= 1) {
    return "1회차";
  }

  return `${companyEvent.occurrence_index + 1}/${companyEvent.repeat_count}회차`;
}

function monthHoursForEmployee(
  employee: MockEmployee,
  days: MonthDay[],
  patternMap: Map<string, MockShiftPattern>,
  shiftMap: Map<string, MockShiftType>
) {
  return Math.round(
    days.reduce((total, day) => {
      const assignment = resolveAssignment(employee, day.date, patternMap);
      return total + calculateShiftHours(resolveShift(assignment.shift_code, shiftMap));
    }, 0)
  );
}

export default function StaffScheduleBoard() {
  const collapsedMonthMobileEvents = 2;
  const todayDateKey = formatDateKey(new Date());
  const monthScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const monthStickyColumnRef = useRef<HTMLDivElement | null>(null);
  const monthTodayHeaderRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [viewDate, setViewDate] = useState(todayDateKey);
  const [overrideModalTarget, setOverrideModalTarget] = useState<OverrideModalTarget | null>(null);
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dragOverEmployeeId, setDragOverEmployeeId] = useState<string | null>(null);
  const [isMonthMobileEventsExpanded, setIsMonthMobileEventsExpanded] = useState(false);
  const [hiddenMonthShiftCodes, setHiddenMonthShiftCodes] = useState<string[]>([]);
  const [overrideForm, setOverrideForm] = useState({
    shift_code: "",
    reason: ""
  });
  const shiftTypes = useMockShiftTypes();
  const employees = useMockEmployees();
  const patterns = useMockShiftPatterns();
  const companyEvents = useMockCompanyEvents();
  const dayFocusDate = viewDate;
  const weekDays = useMemo(() => buildWeekDays(viewDate), [viewDate]);
  const monthDays = useMemo(() => buildMonthDays(viewDate), [viewDate]);
  const weekPeriodLabel = useMemo(
    () => `${formatShortPeriodDate(weekDays[0].date)} - ${formatShortPeriodDate(weekDays[weekDays.length - 1].date)}`,
    [weekDays]
  );
  const monthPeriodLabel = useMemo(() => formatMonthPeriodLabel(viewDate), [viewDate]);
  const dayPeriodLabel = useMemo(() => formatDayPeriodLabel(dayFocusDate), [dayFocusDate]);
  const dayOccurrences = useMemo(
    () => expandMockCompanyEventOccurrences(companyEvents, dayFocusDate, dayFocusDate),
    [companyEvents, dayFocusDate]
  );
  const weekOccurrences = useMemo(
    () => expandMockCompanyEventOccurrences(companyEvents, weekDays[0]?.date, weekDays[weekDays.length - 1]?.date),
    [companyEvents, weekDays]
  );
  const monthOccurrences = useMemo(
    () => expandMockCompanyEventOccurrences(companyEvents, monthDays[0]?.date, monthDays[monthDays.length - 1]?.date),
    [companyEvents, monthDays]
  );

  const shiftMap = useMemo(
    () =>
      new Map(
        shiftTypes.map((item) => [
          item.code,
          item
        ])
      ),
    [shiftTypes]
  );

  const patternMap = useMemo(
    () =>
      new Map(
        patterns.map((item) => [
          item.id,
          item
        ])
      ),
    [patterns]
  );
  const hiddenMonthShiftCodeSet = useMemo(() => new Set(hiddenMonthShiftCodes), [hiddenMonthShiftCodes]);
  const defaultOverrideShiftCode = useMemo(
    () => shiftTypes.find((item) => item.code === "연차")?.code ?? shiftTypes.find((item) => item.code === "OFF")?.code ?? shiftTypes[0]?.code ?? "",
    [shiftTypes]
  );

  const weekEventsByDate = useMemo(() => getEventsByDate(weekDays, weekOccurrences), [weekDays, weekOccurrences]);
  const monthEventsByDate = useMemo(() => getEventsByDate(monthDays, monthOccurrences), [monthDays, monthOccurrences]);
  const dayEvents = useMemo(() => dayOccurrences.filter((companyEvent) => eventIncludesDate(companyEvent, dayFocusDate)), [dayOccurrences, dayFocusDate]);

  const dayAssignments = useMemo(
    () =>
      employees.map((employee) => {
        const assignment = resolveAssignment(employee, dayFocusDate, patternMap);
        return {
          employee,
          assignment
        };
      }),
    [employees, patternMap, dayFocusDate]
  );

  const dayOverrideCount = useMemo(
    () => dayAssignments.filter((item) => item.assignment.source_kind === "override").length,
    [dayAssignments]
  );

  const weekEmployees = useMemo(
    () =>
      employees.map((employee) => ({
        employee,
        assignments: weekDays.map((day) => resolveAssignment(employee, day.date, patternMap))
      })),
    [employees, patternMap, weekDays]
  );

  const monthEmployees = useMemo(
    () =>
      employees.map((employee) => ({
        employee,
        assignments: monthDays.map((day) => resolveAssignment(employee, day.date, patternMap)),
        monthly_hours: monthHoursForEmployee(employee, monthDays, patternMap, shiftMap)
      })),
    [employees, patternMap, shiftMap, monthDays]
  );

  const daySummary = useMemo(
    () => summarizeAssignments(employees, dayAssignments.map((item) => item.assignment), shiftMap),
    [employees, dayAssignments, shiftMap]
  );

  const activePeriodLabel =
    viewMode === "day"
      ? dayPeriodLabel
      : viewMode === "week"
        ? weekPeriodLabel
        : monthPeriodLabel;
  const isTodayFocused = dayFocusDate === todayDateKey;

  const coverageNotes = [
    `근무 배정 ${daySummary.scheduled_shifts}건`,
    `휴무 ${dayAssignments.filter((item) => item.assignment.shift_code === "OFF").length}명`,
    `스케줄 변경 ${dayOverrideCount}건`,
    `회사 이벤트 ${dayEvents.length}건`
  ];

  const weekTableTemplate = {
    gridTemplateColumns: `minmax(190px, 210px) repeat(${weekDays.length}, minmax(112px, 1fr))`
  };

  const monthTableTemplate = {
    gridTemplateColumns: `minmax(190px, 210px) repeat(${monthDays.length}, minmax(56px, 1fr))`
  };

  useEffect(() => {
    if (viewMode !== "month") {
      return;
    }

    const container = monthScrollContainerRef.current;
    const target = monthTodayHeaderRef.current;
    if (!container || !target) {
      return;
    }

    if (container.scrollWidth <= container.clientWidth) {
      return;
    }

    const stickyWidth = monthStickyColumnRef.current?.offsetWidth ?? 0;
    const availableWidth = Math.max(container.clientWidth - stickyWidth, target.clientWidth);
    const rawLeft = target.offsetLeft - stickyWidth - Math.max((availableWidth - target.clientWidth) / 2, 0);
    const maxLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const nextLeft = Math.min(Math.max(rawLeft, 0), maxLeft);

    container.scrollTo({
      left: nextLeft,
      behavior: "smooth"
    });
  }, [viewMode, viewDate, monthDays]);

  const handleShiftDate = (direction: -1 | 1) => {
    setViewDate((prev) => {
      if (viewMode === "day") {
        return addDaysToDateKey(prev, direction);
      }

      if (viewMode === "week") {
        return addDaysToDateKey(prev, direction * 7);
      }

      return addMonthsToDateKey(prev, direction);
    });
  };

  const handleResetDate = () => {
    setViewDate(todayDateKey);
  };

  const toggleMonthShiftCode = (shiftCode: string) => {
    setHiddenMonthShiftCodes((prev) =>
      prev.includes(shiftCode) ? prev.filter((item) => item !== shiftCode) : [...prev, shiftCode]
    );
  };

  const clearDragState = () => {
    setDraggedEmployeeId(null);
    setDragOverEmployeeId(null);
  };

  const handleEmployeeDragStart = (employeeId: string) => (event: DragEvent<HTMLElement>) => {
    setDraggedEmployeeId(employeeId);
    setDragOverEmployeeId(employeeId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", employeeId);
  };

  const handleEmployeeDragOver = (employeeId: string) => (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (dragOverEmployeeId !== employeeId) {
      setDragOverEmployeeId(employeeId);
    }
  };

  const handleEmployeeDrop = (targetEmployeeId: string) => async (event: DragEvent<HTMLElement>) => {
    event.preventDefault();

    const sourceEmployeeId = draggedEmployeeId ?? event.dataTransfer.getData("text/plain");
    clearDragState();

    if (!sourceEmployeeId || sourceEmployeeId === targetEmployeeId) {
      return;
    }

    const nextEmployees = reorderEmployeesById(employees, sourceEmployeeId, targetEmployeeId);
    if (nextEmployees !== employees) {
      try {
        await reorderMockEmployees(nextEmployees);
      } catch (error) {
        console.error("employee reorder error:", error);
      }
    }
  };

  const handleEmployeeDragLeave = (employeeId: string) => () => {
    if (dragOverEmployeeId === employeeId) {
      setDragOverEmployeeId(draggedEmployeeId);
    }
  };

  const closeOverrideModal = () => {
    setOverrideModalTarget(null);
    setOverrideForm({
      shift_code: "",
      reason: ""
    });
  };

  const openOverrideModal = (employee: MockEmployee, assignment: ResolvedAssignment) => {
    const existingOverride = employee.overrides.find((item) => item.date === assignment.date) ?? null;
    const currentShift = resolveShift(assignment.shift_code, shiftMap);

    setOverrideModalTarget({
      employee_id: employee.id,
      employee_name: employee.name,
      date: assignment.date,
      current_shift_code: assignment.shift_code,
      current_shift_name: currentShift.name,
      assignment_note: formatCycleNote(assignment),
      existing_override: existingOverride
    });
    setOverrideForm({
      shift_code: existingOverride?.shift_code ?? defaultOverrideShiftCode,
      reason: existingOverride?.reason ?? ""
    });
  };

  const handleSubmitOverride = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!overrideModalTarget || !overrideForm.shift_code) {
      return;
    }

    try {
      await upsertMockEmployeeOverride({
        employeeId: overrideModalTarget.employee_id,
        overrideId: overrideModalTarget.existing_override?.id ?? null,
        date: overrideModalTarget.date,
        shiftCode: overrideForm.shift_code,
        reason: overrideForm.reason,
        shiftTypes
      });
      closeOverrideModal();
    } catch (error) {
      console.error("employee override save error:", error);
    }
  };

  const handleDeleteOverride = async () => {
    if (!overrideModalTarget?.existing_override) {
      return;
    }

    try {
      await deleteMockEmployeeOverride(
        overrideModalTarget.employee_id,
        overrideModalTarget.existing_override.id
      );
      closeOverrideModal();
    } catch (error) {
      console.error("employee override delete error:", error);
    }
  };

  const getEmployeeDropTargetClass = (employeeId: string) =>
    dragOverEmployeeId === employeeId && draggedEmployeeId !== employeeId ? "ring-1 ring-cyan-500/40 dark:ring-cyan-300/50" : "";

  return (
    <section className="schedule-board mx-auto flex w-full flex-col gap-2 px-0 py-0">
        <div className="mt-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/80 p-1">
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewMode(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                      viewMode === tab.id
                        ? "bg-cyan-300 text-cyan-950"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-lg font-bold text-zinc-50 xl:hidden">{activePeriodLabel}</p>
            </div>

            <div className="hidden flex-1 items-center justify-center xl:flex">
              <p className="text-2xl font-bold text-zinc-50">{activePeriodLabel}</p>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end xl:min-w-[132px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/80 text-zinc-200"
                  aria-label="이전 기간"
                  title="이전 기간"
                >
                  <ChevronDownIcon className="h-4 w-4 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={handleResetDate}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-950/25 text-cyan-100"
                  aria-label="기준일로 이동"
                  title="기준일로 이동"
                >
                  <CalendarDayIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950/80 text-zinc-200"
                  aria-label="다음 기간"
                  title="다음 기간"
                >
                  <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewMode !== "day" ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {shiftTypes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleMonthShiftCode(item.code)}
                aria-pressed={!hiddenMonthShiftCodeSet.has(item.code)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  hiddenMonthShiftCodeSet.has(item.code) ? "opacity-40" : "shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                }`}
                style={{
                  backgroundColor: `${item.color}22`,
                  borderColor: `${item.color}66`,
                  color: item.text_color
                }}
                title={`${item.name} ${hiddenMonthShiftCodeSet.has(item.code) ? "표시" : "숨기기"}`}
              >
                <span
                  className="inline-flex min-w-[24px] items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: item.color, color: item.text_color }}
                >
                  {item.code}
                </span>
                <span>{item.name}</span>
                {!item.all_day && item.start && item.end ? <span className="text-[11px] opacity-80">{item.start}-{item.end}</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        {viewMode === "day" ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-3">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-100">일간 상세 뷰</p>
                    {isTodayFocused ? (
                      <span className="rounded-full border border-cyan-300/35 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
                        오늘
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-zinc-400">직원별 근무 배치와 적용된 패턴 단계까지 확인합니다.</p>
                </div>
                <p className="text-xs text-zinc-500">기준 날짜: {dayFocusDate}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {coverageNotes.map((note) => (
                  <span key={note} className="rounded-full border border-cyan-300/20 bg-cyan-950/20 px-2.5 py-1 text-[11px] text-cyan-100">
                    {note}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500">직원 카드 오른쪽 핸들을 드래그해 순서를 바꾸고, 카드 안 버튼으로 해당 날짜 스케줄 변경을 바로 추가하거나 수정할 수 있습니다.</p>

              <div className="grid gap-2.5 lg:grid-cols-2">
                {dayAssignments.map(({ employee, assignment }) => {
                  const shift = resolveShift(assignment.shift_code, shiftMap);
                  const overtime = employee.weekly_hours > 40;

                  return (
                    <article
                      key={employee.id}
                      onDragOver={handleEmployeeDragOver(employee.id)}
                      onDrop={handleEmployeeDrop(employee.id)}
                      onDragLeave={handleEmployeeDragLeave(employee.id)}
                      className={`rounded-xl border border-zinc-700/70 bg-zinc-950/80 p-3 ${getEmployeeDropTargetClass(employee.id)}`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: employee.color }}
                          >
                            {employee.name.slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-zinc-50">{employee.name}</p>
                            <p className="truncate text-xs text-zinc-400">
                              {employee.team} · {employee.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <div
                            draggable
                            onDragStart={handleEmployeeDragStart(employee.id)}
                            onDragEnd={clearDragState}
                            className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md border border-zinc-700 text-zinc-400 active:cursor-grabbing"
                            title={`${employee.name} 순서 드래그`}
                          >
                            <DragHandleIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                          <span
                            className="inline-flex min-w-[54px] items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black"
                            style={{ backgroundColor: shift.color, color: shift.text_color }}
                          >
                            {shift.code}
                          </span>
                          {assignment.source_kind === "override" ? (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                              예외 적용
                            </span>
                          ) : null}
                          {overtime ? (
                            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                              초과
                            </span>
                          ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-zinc-700/70 bg-zinc-900/80 p-2.5">
                        <p className="text-sm font-semibold text-zinc-50">{shift.name}</p>
                        <p className="mt-1 text-xs text-zinc-300">{describeShiftTime(shift)}</p>
                        <p className="mt-2 text-xs text-zinc-400">{formatCycleNote(assignment)}</p>
                        {formatAssignmentContext(assignment) ? (
                          <p className="mt-1 text-[11px] text-zinc-500">{formatAssignmentContext(assignment)}</p>
                        ) : null}
                        <p className="mt-2 text-sm leading-5 text-zinc-300">{shift.description}</p>
                        <button
                          type="button"
                          onClick={() => openOverrideModal(employee, assignment)}
                          className="mt-3 inline-flex rounded-md border border-cyan-300/30 bg-cyan-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100"
                        >
                          {assignment.source_kind === "override" ? "스케줄 변경 수정" : "이 날짜 스케줄 변경"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-3 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">회사 이벤트</p>
                <p className="text-xs text-zinc-400">선택 날짜에 걸리는 사내 이벤트를 함께 표시합니다.</p>
              </div>

              <div className="space-y-2.5">
              {dayEvents.length > 0 ? (
                  dayEvents.map((companyEvent) => (
                    <article
                      key={companyEvent.occurrence_id}
                      className="rounded-xl border p-3"
                      style={{ borderColor: `${companyEvent.color}66`, backgroundColor: `${companyEvent.color}14` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-zinc-50">{companyEvent.title}</p>
                          <p className="mt-1 text-xs text-zinc-300">
                            {companyEvent.category} · {companyEvent.occurrence_start_date}
                            {companyEvent.occurrence_start_date !== companyEvent.occurrence_end_date
                              ? ` ~ ${companyEvent.occurrence_end_date}`
                              : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {formatOccurrenceLabel(companyEvent)} · {describeEventRepeat(companyEvent)}
                          </p>
                        </div>
                        <span
                          className="inline-flex h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: companyEvent.color }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 text-sm leading-5 text-zinc-300">{companyEvent.note || "메모 없음"}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-500">
                    선택 날짜에 등록된 회사 이벤트가 없습니다.
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : null}

        {viewMode === "week" ? (
          <div className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
              <div>
                <p className="text-sm font-semibold text-zinc-100">직원별 주간 근무표</p>
                <p className="text-xs text-zinc-400">Smartsheet 스타일 행-열 배치와 이벤트 행을 함께 보여줍니다.</p>
              </div>
              <p className="text-xs text-zinc-500">직원별 패턴 주입 결과가 날짜별로 계산됩니다.</p>
            </div>

            <div className="mb-2.5 grid gap-2 lg:hidden">
              <p className="text-[11px] text-zinc-500">직원 행 이름 영역 또는 카드 헤더 핸들을 드래그해 순서를 바꾸고, 날짜 셀을 눌러 스케줄 변경을 추가하거나 수정할 수 있습니다.</p>
              {weekDays.map((day) => {
                const events = weekEventsByDate.get(day.date) ?? [];
                if (events.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={`${day.date}-event-list`}
                    className={`rounded-lg border p-2.5 ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")}`}
                  >
                    <p className={`text-xs font-semibold ${getDayTitleClass(day.tone)}`}>
                      {day.label} · {day.display}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {events.map((companyEvent) => (
                        <span
                          key={companyEvent.occurrence_id}
                          className="rounded-full border px-3 py-1.5 text-xs font-medium text-zinc-100"
                          style={{ borderColor: `${companyEvent.color}66`, backgroundColor: `${companyEvent.color}20` }}
                        >
                          {companyEvent.title}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-auto lg:block">
              <div className="grid min-w-[980px] gap-px rounded-lg bg-zinc-800/80 p-px" style={weekTableTemplate}>
                <div className="sticky left-0 z-20 rounded-l-lg bg-zinc-950/95 px-3 py-2.5">
                  <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase">직원</p>
                </div>
                {weekDays.map((day) => (
                  <div
                    key={day.date}
                    className={`border-b px-2 py-2.5 text-center ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayAccentClass(day.is_today)} ${
                      day.is_today ? "border-cyan-300/35" : ""
                    }`}
                  >
                    <p className={`text-xs font-semibold ${getDayTitleClass(day.tone, day.is_today)}`}>{day.label}</p>
                    <p className={`mt-1 text-sm font-bold ${getDayDisplayClass(day.tone, day.is_today)}`}>{day.display}</p>
                  </div>
                ))}

                <div className="sticky left-0 z-10 flex items-center rounded-l-lg bg-zinc-950/95 px-3 py-2.5">
                  <p className="text-sm font-semibold text-zinc-100">회사 이벤트</p>
                </div>
                {weekDays.map((day) => {
                  const events = weekEventsByDate.get(day.date) ?? [];

                  return (
                    <div
                      key={`${day.date}-events`}
                      className={`px-1.5 py-2 ${getTodayColumnClass(day.is_today)}`}
                    >
                      <div className={`flex min-h-[88px] flex-col gap-2 rounded-lg border px-2.5 py-2 ${getMonthToneBorderClass("weekday")} ${getMonthToneClass("weekday")}`}>
                        {events.length > 0 ? (
                          events.map((companyEvent) => (
                            <span
                              key={companyEvent.occurrence_id}
                              className="rounded-md px-2 py-1.5 text-xs font-semibold text-zinc-100"
                              style={{ backgroundColor: `${companyEvent.color}24`, border: `1px solid ${companyEvent.color}55` }}
                            >
                              {companyEvent.title}
                            </span>
                          ))
                        ) : (
                          <span className="my-auto text-center text-xs text-zinc-500">없음</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {weekEmployees.map(({ employee, assignments }) => {
                  const overtime = employee.weekly_hours > 40;

                  return (
                    <div key={employee.id} className="contents">
                      <div
                        draggable
                        onDragStart={handleEmployeeDragStart(employee.id)}
                        onDragEnd={clearDragState}
                        onDragOver={handleEmployeeDragOver(employee.id)}
                        onDrop={handleEmployeeDrop(employee.id)}
                        onDragLeave={handleEmployeeDragLeave(employee.id)}
                        className={`sticky left-0 z-10 flex cursor-grab flex-col justify-center rounded-l-lg bg-zinc-950/95 px-3 py-2.5 active:cursor-grabbing ${getEmployeeDropTargetClass(employee.id)}`}
                        title={`${employee.name} 순서 드래그`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                            style={{ backgroundColor: employee.color }}
                          >
                            {employee.name.slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-zinc-50">{employee.name}</p>
                            <p className="truncate text-xs text-zinc-400">
                              {employee.team} · {employee.role}
                            </p>
                          </div>
                          <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-400">
                            <DragHandleIcon className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-300">
                            주 {employee.weekly_hours}시간
                          </span>
                          {overtime ? (
                            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                              초과
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {assignments.map((assignment, index) => {
                        const day = weekDays[index];
                        const shift = resolveShift(assignment.shift_code, shiftMap);
                        const isShiftVisible = !hiddenMonthShiftCodeSet.has(assignment.shift_code);

                        return (
                          <div
                            key={`${employee.id}-${assignment.date}`}
                            className={`min-h-[92px] border-x px-1.5 py-1.5 ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayColumnClass(day.is_today)}`}
                          >
                            <button
                              type="button"
                              onClick={() => openOverrideModal(employee, assignment)}
                              className="flex h-full w-full flex-col rounded-lg border px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:brightness-110"
                              style={{
                                backgroundColor: isShiftVisible ? `${shift.color}18` : "rgba(24,24,27,0.76)",
                                borderColor: isShiftVisible ? `${shift.color}88` : "rgba(82,82,91,0.72)",
                                boxShadow:
                                  !isShiftVisible
                                    ? "inset 0 1px 0 rgba(255,255,255,0.03)"
                                    : assignment.source_kind === "override"
                                    ? "inset 0 0 0 1px rgba(255,255,255,0.34)"
                                    : "inset 0 1px 0 rgba(255,255,255,0.05)"
                              }}
                              title={`${employee.name} · ${assignment.date} 스케줄 변경`}
                            >
                              {isShiftVisible ? (
                                <>
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span
                                      className="inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 text-[11px] font-black"
                                      style={{ backgroundColor: shift.color, color: shift.text_color }}
                                    >
                                      {shift.code}
                                    </span>
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-[11px] text-zinc-400">{employee.role}</span>
                                      {assignment.source_kind === "override" ? (
                                        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                                          예외
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-2 text-sm font-bold text-zinc-50">{shift.name}</p>
                                  <p className="text-xs text-zinc-300">{describeShiftTime(shift)}</p>
                                  <p className="mt-1.5 text-[10px] leading-4 text-zinc-300">{formatCycleNote(assignment)}</p>
                                  {formatAssignmentContext(assignment) ? (
                                    <p className="mt-1 text-[10px] leading-4 text-zinc-500">{formatAssignmentContext(assignment)}</p>
                                  ) : null}
                                </>
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs font-medium text-zinc-500">숨김</div>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {weekEmployees.map(({ employee, assignments }) => (
                <article
                  key={employee.id}
                  onDragOver={handleEmployeeDragOver(employee.id)}
                  onDrop={handleEmployeeDrop(employee.id)}
                  onDragLeave={handleEmployeeDragLeave(employee.id)}
                  className={`rounded-xl border border-zinc-700/70 bg-zinc-950/85 p-2.5 ${getEmployeeDropTargetClass(employee.id)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: employee.color }}
                      >
                        {employee.name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-50">{employee.name}</p>
                        <p className="truncate text-xs text-zinc-400">
                          {employee.team} · {employee.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div
                        draggable
                        onDragStart={handleEmployeeDragStart(employee.id)}
                        onDragEnd={clearDragState}
                        className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md border border-zinc-700 text-zinc-400 active:cursor-grabbing"
                        title={`${employee.name} 순서 드래그`}
                      >
                        <DragHandleIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                        {employee.weekly_hours}h
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    {assignments.map((assignment, index) => {
                      const day = weekDays[index];
                      const shift = resolveShift(assignment.shift_code, shiftMap);
                      const isShiftVisible = !hiddenMonthShiftCodeSet.has(assignment.shift_code);

                        return (
                          <button
                            type="button"
                            onClick={() => openOverrideModal(employee, assignment)}
                            key={`${employee.id}-${assignment.date}-mobile`}
                            className={`rounded-lg border px-2.5 py-2 text-left transition hover:brightness-110 ${getMonthToneBorderClass("weekday")} ${getMonthToneClass("weekday")}`}
                            title={`${employee.name} · ${assignment.date} 스케줄 변경`}
                          >
                            <p className="text-[11px] font-semibold text-zinc-400">
                              {day.label} · {day.display}
                            </p>
                            {isShiftVisible ? (
                              <>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <span
                                    className="inline-flex min-w-[36px] items-center justify-center rounded-md px-2 py-1 text-[10px] font-black"
                                    style={{ backgroundColor: shift.color, color: shift.text_color }}
                                  >
                                    {shift.code}
                                  </span>
                                  <span className="text-sm font-bold text-zinc-50">{shift.name}</span>
                                  {assignment.source_kind === "override" ? (
                                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                                      예외
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-zinc-300">{describeShiftTime(shift)}</p>
                                <p className="mt-1 text-[11px] leading-4 text-zinc-400">{formatCycleNote(assignment)}</p>
                                {formatAssignmentContext(assignment) ? (
                                  <p className="mt-1 text-[10px] leading-4 text-zinc-500">{formatAssignmentContext(assignment)}</p>
                                ) : null}
                              </>
                            ) : (
                              <div className="mt-2 flex min-h-[58px] items-center justify-center text-xs font-medium text-zinc-500">숨김</div>
                            )}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {viewMode === "month" ? (
          <div className="mt-4 rounded-2xl border border-zinc-700/70 bg-zinc-950/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">월간 태그 뷰</p>
                <p className="text-xs text-zinc-400">월간은 `O/M/C/N/OFF/OPEN` 태그만 빠르게 확인하는 요약형입니다.</p>
              </div>
              <p className="text-xs text-zinc-500">토요일은 파란 계열, 일요일은 빨간 계열 컨테이너를 사용합니다.</p>
            </div>
            <p className="px-1 pb-2 text-[11px] text-zinc-500">직원 행 이름 영역 또는 카드 헤더 핸들을 드래그해 순서를 바꾸고, 날짜 셀을 누르면 바로 스케줄 변경 모달이 열립니다.</p>

            <div className="mb-3 grid gap-2 lg:hidden">
              {(isMonthMobileEventsExpanded ? monthOccurrences : monthOccurrences.slice(0, collapsedMonthMobileEvents)).map((companyEvent) => (
                <article
                  key={`${companyEvent.occurrence_id}-month`}
                  className="rounded-xl border p-3"
                  style={{ borderColor: `${companyEvent.color}66`, backgroundColor: `${companyEvent.color}14` }}
                >
                  <p className="text-sm font-semibold text-zinc-50">{companyEvent.title}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {companyEvent.occurrence_start_date}
                    {companyEvent.occurrence_start_date !== companyEvent.occurrence_end_date
                      ? ` ~ ${companyEvent.occurrence_end_date}`
                      : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {formatOccurrenceLabel(companyEvent)} · {describeEventRepeat(companyEvent)}
                  </p>
                </article>
              ))}
              {monthOccurrences.length > collapsedMonthMobileEvents ? (
                <button
                  type="button"
                  onClick={() => setIsMonthMobileEventsExpanded((prev) => !prev)}
                  className="inline-flex w-fit rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200"
                >
                  {isMonthMobileEventsExpanded ? "회사 이벤트 접기" : `회사 이벤트 더보기 ${monthOccurrences.length - collapsedMonthMobileEvents}건`}
                </button>
              ) : null}
            </div>

            <div ref={monthScrollContainerRef} className="hidden overflow-auto lg:block">
              <div className="grid min-w-[1520px] gap-px rounded-lg bg-zinc-800/80 p-px" style={monthTableTemplate}>
                <div ref={monthStickyColumnRef} className="sticky left-0 z-20 rounded-l-lg bg-zinc-950/95 px-3 py-2">
                  <p className="text-xs font-semibold tracking-[0.2em] text-zinc-400 uppercase">직원</p>
                </div>
                {monthDays.map((day) => (
                  <div
                    key={day.date}
                    ref={day.is_today ? monthTodayHeaderRef : null}
                    className={`border px-1 py-2 text-center ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayAccentClass(day.is_today)}`}
                  >
                    <p className={`text-[11px] font-semibold ${getDayTitleClass(day.tone, day.is_today)}`}>{day.label}</p>
                    <p className={`mt-0.5 text-sm font-bold ${getDayDisplayClass(day.tone, day.is_today)}`}>{day.display}</p>
                  </div>
                ))}

                <div className="sticky left-0 z-10 flex items-center rounded-l-lg bg-zinc-950/95 px-3 py-2">
                  <p className="text-sm font-semibold text-zinc-100">회사 이벤트</p>
                </div>
                {monthDays.map((day) => {
                  const events = monthEventsByDate.get(day.date) ?? [];

                  return (
                    <div
                      key={`${day.date}-month-events`}
                      className={`border px-1 py-1.5 ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayColumnClass(day.is_today)}`}
                    >
                      <div className="flex min-h-[40px] flex-col items-center justify-center gap-1">
                        {events.length > 0 ? (
                          <>
                            {events.slice(0, 2).map((companyEvent) => (
                              <span
                                key={companyEvent.occurrence_id}
                                className="inline-flex min-w-[36px] items-center justify-center rounded-md px-1.5 py-1 text-[11px] font-semibold text-zinc-100"
                                style={{ backgroundColor: `${companyEvent.color}24`, border: `1px solid ${companyEvent.color}55` }}
                                title={`${companyEvent.title} · ${formatOccurrenceLabel(companyEvent)}`}
                              >
                                {companyEvent.title.slice(0, 3)}
                              </span>
                            ))}
                            {events.length > 2 ? <span className="text-[10px] text-zinc-400">+{events.length - 2}</span> : null}
                          </>
                        ) : (
                          <span className="text-[10px] text-zinc-500">-</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {monthEmployees.map(({ employee, assignments, monthly_hours }) => (
                  <div key={employee.id} className="contents">
                    <div
                      draggable
                      onDragStart={handleEmployeeDragStart(employee.id)}
                      onDragEnd={clearDragState}
                      onDragOver={handleEmployeeDragOver(employee.id)}
                      onDrop={handleEmployeeDrop(employee.id)}
                      onDragLeave={handleEmployeeDragLeave(employee.id)}
                      className={`sticky left-0 z-10 flex cursor-grab flex-col justify-center rounded-l-lg bg-zinc-950/95 px-3 py-2 active:cursor-grabbing ${getEmployeeDropTargetClass(employee.id)}`}
                      title={`${employee.name} 순서 드래그`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: employee.color }}
                        >
                          {employee.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-zinc-50">{employee.name}</p>
                          <p className="truncate text-xs text-zinc-400">
                            {employee.team} · {employee.role}
                          </p>
                        </div>
                        <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-400">
                          <DragHandleIcon className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">월 {monthly_hours}시간</div>
                    </div>

                    {assignments.map((assignment, index) => {
                      const day = monthDays[index];
                      const shift = resolveShift(assignment.shift_code, shiftMap);
                      const isShiftVisible = !hiddenMonthShiftCodeSet.has(assignment.shift_code);

                      return (
                        <div
                          key={`${employee.id}-${assignment.date}`}
                          className={`border px-1 py-1.5 ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayColumnClass(day.is_today)}`}
                        >
                          <button
                            type="button"
                            onClick={() => openOverrideModal(employee, assignment)}
                            className="flex min-h-[34px] w-full items-center justify-center"
                            title={`${employee.name} · ${assignment.date} 스케줄 변경`}
                          >
                            {isShiftVisible ? (
                              <span
                                className="inline-flex min-w-[36px] items-center justify-center rounded-md px-1.5 py-1 text-xs font-black"
                                style={{
                                  backgroundColor: shift.color,
                                  color: shift.text_color,
                                  boxShadow:
                                    assignment.source_kind === "override"
                                      ? "inset 0 0 0 1px rgba(255,255,255,0.35)"
                                      : "none"
                                }}
                                title={`${day.date} ${shift.name}${
                                  assignment.source_kind === "override" ? ` · 스케줄 변경(${assignment.source_note})` : ""
                                }`}
                              >
                                {shift.code}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {monthEmployees.map(({ employee, assignments, monthly_hours }) => {
                return (
                  <article
                    key={employee.id}
                    onDragOver={handleEmployeeDragOver(employee.id)}
                    onDrop={handleEmployeeDrop(employee.id)}
                    onDragLeave={handleEmployeeDragLeave(employee.id)}
                    className={`rounded-xl border border-zinc-700/70 bg-zinc-950/85 p-2.5 ${getEmployeeDropTargetClass(employee.id)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: employee.color }}
                        >
                          {employee.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-zinc-50">{employee.name}</p>
                          <p className="truncate text-xs text-zinc-400">
                            {employee.team} · {employee.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          draggable
                          onDragStart={handleEmployeeDragStart(employee.id)}
                          onDragEnd={clearDragState}
                          className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md border border-zinc-700 text-zinc-400 active:cursor-grabbing"
                          title={`${employee.name} 순서 드래그`}
                        >
                          <DragHandleIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="rounded-full border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">
                          {monthly_hours}h
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                      {assignments.map((assignment, index) => {
                        const day = monthDays[index];
                        const shift = resolveShift(assignment.shift_code, shiftMap);
                        const isShiftVisible = !hiddenMonthShiftCodeSet.has(assignment.shift_code);

                        return (
                          <button
                            type="button"
                            onClick={() => openOverrideModal(employee, assignment)}
                            key={`${employee.id}-${assignment.date}-mobile`}
                            className={`rounded-lg border px-1 py-1.5 text-center ${getMonthToneClass("weekday")} ${getMonthToneBorderClass("weekday")} ${getTodayAccentClass(day.is_today)}`}
                            title={`${employee.name} · ${assignment.date} 스케줄 변경`}
                          >
                            <p className="text-[11px] font-semibold text-zinc-300">{day.display}</p>
                            {isShiftVisible ? (
                              <span
                                className="mt-1 inline-flex min-w-[34px] items-center justify-center rounded-md px-1.5 py-1 text-[11px] font-black"
                                style={{
                                  backgroundColor: shift.color,
                                  color: shift.text_color,
                                  boxShadow:
                                    assignment.source_kind === "override"
                                      ? "inset 0 0 0 1px rgba(255,255,255,0.35)"
                                      : "none"
                                }}
                              >
                                {shift.code}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {overrideModalTarget ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 md:items-center md:p-4"
            onClick={closeOverrideModal}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-[#070b14] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-50">
                    {overrideModalTarget.existing_override ? "스케줄 변경 수정" : "스케줄 변경 추가"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {overrideModalTarget.employee_name} · {overrideModalTarget.date}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOverrideModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-200/20 text-cyan-100"
                  aria-label="스케줄 변경 모달 닫기"
                  title="닫기"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="mb-3 rounded-xl border border-zinc-700/70 bg-zinc-950/70 p-3">
                <p className="text-xs font-semibold text-zinc-200">현재 계산 결과</p>
                <p className="mt-1 text-sm text-zinc-100">
                  {overrideModalTarget.current_shift_code} · {overrideModalTarget.current_shift_name}
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">{overrideModalTarget.assignment_note}</p>
              </div>

              <form onSubmit={handleSubmitOverride} className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-300">변경할 근무 형태</span>
                  <select
                    value={overrideForm.shift_code}
                    onChange={(event) => setOverrideForm((prev) => ({ ...prev, shift_code: event.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                  >
                    {shiftTypes.map((shiftType) => (
                      <option key={shiftType.id} value={shiftType.code}>
                        {shiftType.code} · {shiftType.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-300">사유</span>
                  <textarea
                    value={overrideForm.reason}
                    onChange={(event) => setOverrideForm((prev) => ({ ...prev, reason: event.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50"
                    placeholder="예: 개인 연차, 교육, 교대 변경"
                  />
                </label>

                <p className="text-[11px] leading-5 text-zinc-500">
                  저장하면 이 날짜는 반복 패턴보다 스케줄 변경이 우선 적용됩니다.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {overrideModalTarget.existing_override ? (
                    <button
                      type="button"
                      onClick={handleDeleteOverride}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-300/35 px-3 py-2 text-sm text-rose-200"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      삭제
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeOverrideModal}
                      className="rounded-lg border border-cyan-300/25 px-3 py-2 text-sm text-cyan-100"
                    >
                      취소
                    </button>
                  )}

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-950"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    {overrideModalTarget.existing_override ? "수정 저장" : "스케줄 변경 저장"}
                  </button>
                </div>

                {overrideModalTarget.existing_override ? (
                  <button
                    type="button"
                    onClick={closeOverrideModal}
                    className="w-full rounded-lg border border-cyan-300/25 px-3 py-2 text-sm text-cyan-100"
                  >
                    닫기
                  </button>
                ) : null}
              </form>
            </div>
          </div>
        ) : null}
    </section>
  );
}
