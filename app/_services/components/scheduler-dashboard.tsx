"use client";

import { dayjs, type Dayjs } from "@/app/_commons/utils/dayjs";
import { FetchBuilder } from "@/app/_commons/utils/func";
import {
  CalendarDayIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CloseIcon,
  EditIcon,
  ListIcon,
  PaletteIcon,
  PlusIcon,
  TrashIcon
} from "@/app/_services/components/icons";
import { MarkdownEditor, MarkdownViewer } from "@/app/_services/components/markdown-editor";
import { NumberDropdown } from "@/app/_services/components/number-dropdown";
import { TopNavbar } from "@/app/_services/components/top-navbar";
import { useAuthActions } from "@/app/_services/hooks/use-auth-actions";
import type {
  CalendarEvent,
  ConfirmDialogState,
  Pattern,
  PublicHolidayListResponse,
  RepeatUnitValue,
  ScheduleDetailForm,
  ScheduleGroupDetailResponse,
  ScheduleItem,
  ScheduleLabel,
  ScheduleListResponse,
  ShiftType
} from "@/app/_services/scheduler/types";
import {
  DEFAULT_LABEL_COLOR,
  SEOUL_OFFSET,
  SEOUL_TZ,
  addByRepeatUnit,
  buildUserHolidayDateSet,
  collectYearMonthTargets,
  extractMemoText,
  extractRepeatSummary,
  hasScheduleRangeChanged,
  normalizeHexColor,
  seedColor,
  toDateInput,
  toIsoWithOffset,
  toScheduleDetailForm,
  toSeoulDate,
  toSeoulDateKeyFromDate,
  toSeoulDateTime
} from "@/app/_services/scheduler/utils";
import { timePickerFieldSx, toTimePickerValue } from "@/app/_services/utils/time-picker";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type DropdownOption = {
  value: string;
  label: string;
  subtitle?: string;
  color?: string;
};

type DropdownSelectProps = {
  options: DropdownOption[];
  value: string;
  onChange: (nextValue: string) => void;
  tone: "teal" | "cyan";
  placeholder: string;
};

function DropdownSelect({ options, value, onChange, tone, placeholder }: DropdownSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((item) => item.value === value), [options, value]);
  const borderClass = tone === "teal" ? "border-teal-100/20 bg-teal-950/30" : "border-cyan-100/20 bg-cyan-950/30";
  const textClass = tone === "teal" ? "text-teal-50" : "text-cyan-50";
  const subTextClass = tone === "teal" ? "text-teal-100/65" : "text-cyan-100/65";

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

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${borderClass}`}>
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: normalizeHexColor(selected.color ?? "") || "#0EA5E9" }}
            />
          ) : (
            <span className="inline-block h-3 w-3 shrink-0 rounded-full bg-white/25" />
          )}
          <span className={`truncate ${textClass}`}>{selected?.label ?? placeholder}</span>
          {selected?.subtitle ? <span className={`shrink-0 text-xs ${subTextClass}`}>{selected.subtitle}</span> : null}
        </span>
        <span className={`ml-2 text-xs ${subTextClass}`}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className={`absolute z-30 mt-1 w-full rounded-lg border ${borderClass} p-1 shadow-xl backdrop-blur`}>
          {options.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => handleSelect(item.value)}
                className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-black/20 ${
                  active ? "bg-black/30" : ""
                } ${textClass}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: normalizeHexColor(item.color ?? "") || "#0EA5E9" }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.subtitle ? <span className={`shrink-0 text-xs ${subTextClass}`}>{item.subtitle}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function SchedulerDashboard() {
  const { logout } = useAuthActions();
  const calendarRef = useRef<FullCalendar>(null);

  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [labels, setLabels] = useState<ScheduleLabel[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isFilterColorOnly, setIsFilterColorOnly] = useState(false);
  const [isWeekendHolidayThemeEnabled, setIsWeekendHolidayThemeEnabled] = useState(true);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelModalTargetId, setLabelModalTargetId] = useState<string | null>(null);
  const [labelModalForm, setLabelModalForm] = useState({
    name: "",
    color: DEFAULT_LABEL_COLOR
  });
  const isLabelEditMode = labelModalTargetId !== null;

  const [range, setRange] = useState(() => {
    const now = dayjs().tz(SEOUL_TZ);
    return {
      start: now.startOf("month").subtract(7, "day").toISOString(),
      end: now.endOf("month").add(7, "day").toISOString()
    };
  });
  const [scheduleSearchInput, setScheduleSearchInput] = useState("");
  const [scheduleSearchKeyword, setScheduleSearchKeyword] = useState("");

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [publicHolidayDateSet, setPublicHolidayDateSet] = useState<Set<string>>(new Set());
  const [publicHolidayNameMap, setPublicHolidayNameMap] = useState<Record<string, string>>({});
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleItem | null>(null);
  const [repeatGroupItems, setRepeatGroupItems] = useState<ScheduleItem[]>([]);
  const [repeatGroupLoading, setRepeatGroupLoading] = useState(false);
  const [repeatGroupExpanded, setRepeatGroupExpanded] = useState(false);
  const [isDetailEditMode, setIsDetailEditMode] = useState(false);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const confirmActionRef = useRef<null | (() => Promise<void> | void)>(null);
  const cancelActionRef = useRef<null | (() => void)>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    message: "",
    confirmText: "확인",
    tone: "warning"
  });
  const [confirmDialogBusy, setConfirmDialogBusy] = useState(false);
  const [detailForm, setDetailForm] = useState<ScheduleDetailForm>({
    title: "",
    schedule_label_id: "",
    start_date: toDateInput(dayjs()),
    end_date: toDateInput(dayjs()),
    start_time: "09:00",
    end_time: "18:00",
    all_day: false,
    memo: ""
  });
  const [registerMode, setRegisterMode] = useState<"manual" | "pattern">("manual");

  const [manualForm, setManualForm] = useState({
    schedule_type_id: "",
    schedule_label_id: "",
    title: "",
    start_date: toDateInput(dayjs()),
    end_date: toDateInput(dayjs()),
    start_time: "09:00",
    end_time: "18:00",
    all_day: false,
    repeat_enabled: false,
    repeat_unit: "week" as RepeatUnitValue,
    repeat_count: 1,
    memo: ""
  });

  const [patternForm, setPatternForm] = useState({
    pattern_id: "",
    schedule_label_id: "",
    start_date: toDateInput(dayjs()),
    repeat_count: 1,
    memo: ""
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setScheduleSearchKeyword(scheduleSearchInput.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [scheduleSearchInput]);

  const listScheduleApi = useMemo(() => {
    const params = new URLSearchParams({
      start: range.start,
      end: range.end
    });
    if (scheduleSearchKeyword) {
      params.set("q", scheduleSearchKeyword);
    }
    return `/api/sardi/schedules?${params.toString()}`;
  }, [range.end, range.start, scheduleSearchKeyword]);

  const visibleScheduleItems = useMemo(() => {
    const selectedSet = new Set(selectedLabelIds);

    return scheduleItems.filter((item) => selectedSet.has(item.schedule_label_id));
  }, [scheduleItems, selectedLabelIds]);

  const filteredEvents = useMemo<CalendarEvent[]>(() => {
    return visibleScheduleItems.map((item) => {
      const scheduleTitle = item.title?.trim() || item.schedule_type_name;
      const color = normalizeHexColor(item.schedule_label_color) || seedColor(scheduleTitle);
      return {
        id: item.id,
        title: scheduleTitle,
        start: item.all_day ? toSeoulDate(item.start_ts) : toSeoulDateTime(item.start_ts),
        end: item.all_day ? toSeoulDate(item.end_ts) : toSeoulDateTime(item.end_ts),
        allDay: item.all_day,
        backgroundColor: color,
        borderColor: color,
        textColor: "#F5FFFF",
        extendedProps: {
          labelId: item.schedule_label_id
        }
      };
    });
  }, [visibleScheduleItems]);

  const userHolidayDateSet = useMemo(() => buildUserHolidayDateSet(visibleScheduleItems), [visibleScheduleItems]);

  const getHolidayClasses = useCallback(
    (date: Date) => {
      const dateKey = toSeoulDateKeyFromDate(date);
      const classes: string[] = [];

      if (userHolidayDateSet.has(dateKey)) {
        classes.push("fc-user-holiday");
      }

      if (isWeekendHolidayThemeEnabled && publicHolidayDateSet.has(dateKey)) {
        classes.push("fc-holiday-red");
      }

      return classes;
    },
    [isWeekendHolidayThemeEnabled, publicHolidayDateSet, userHolidayDateSet]
  );

  const renderDayCellContent = useCallback(
    (arg: { date: Date; dayNumberText: string }) => {
      const dateNumber = arg.dayNumberText.replace(/일$/, "");
      const holidayName = publicHolidayNameMap[toSeoulDateKeyFromDate(arg.date)];

      if (!holidayName) {
        return dateNumber;
      }

      return (
        <>
          <span>{dateNumber}</span>
          <span className="fc-day-holiday-name" title={holidayName}>
            {holidayName}
          </span>
        </>
      );
    },
    [publicHolidayNameMap]
  );

  const visibleRepeatGroupItems = useMemo(
    () => (repeatGroupExpanded ? repeatGroupItems : repeatGroupItems.slice(0, 4)),
    [repeatGroupExpanded, repeatGroupItems]
  );
  const hiddenRepeatGroupCount = Math.max(repeatGroupItems.length - visibleRepeatGroupItems.length, 0);

  const labelOptions = useMemo<DropdownOption[]>(
    () =>
      labels.map((item) => ({
        value: item.id,
        label: item.name,
        color: item.color
      })),
    [labels]
  );

  const patternOptions = useMemo<DropdownOption[]>(
    () =>
      patterns.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.cycle_days}일)`
      })),
    [patterns]
  );

  const repeatUnitOptions = useMemo<DropdownOption[]>(
    () => [
      { value: "week", label: "주 반복" },
      { value: "month", label: "월 반복" },
      { value: "year", label: "년 반복" }
    ],
    []
  );

  const loadShiftTypes = useCallback(async () => {
    const payload = await FetchBuilder.get().url("/api/sardi/shift-types").execute<ShiftType[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "근무 타입 조회 실패");
    }

    setManualForm((prev) => {
      if (prev.schedule_type_id || payload.length === 0) {
        return prev;
      }
      return { ...prev, schedule_type_id: payload[0].id };
    });
  }, []);

  const loadPatterns = useCallback(async () => {
    const payload = await FetchBuilder.get().url("/api/sardi/patterns").execute<Pattern[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "패턴 조회 실패");
    }

    setPatterns(payload);

    setPatternForm((prev) => {
      if (prev.pattern_id || payload.length === 0) {
        return prev;
      }
      return { ...prev, pattern_id: payload[0].id };
    });
  }, []);

  const loadLabels = useCallback(async () => {
    const payload = await FetchBuilder.get()
      .url("/api/sardi/schedule-labels")
      .execute<ScheduleLabel[] | { error?: string }>();
    if (!Array.isArray(payload)) {
      throw new Error(payload.error ?? "라벨 조회 실패");
    }

    setLabels(payload);

    const nextDefaultLabelId = payload[0]?.id ?? "";

    setManualForm((prev) => {
      const isAlive = payload.some((label) => label.id === prev.schedule_label_id);
      if (isAlive) {
        return prev;
      }
      return { ...prev, schedule_label_id: nextDefaultLabelId };
    });

    setPatternForm((prev) => {
      const isAlive = payload.some((label) => label.id === prev.schedule_label_id);
      if (isAlive) {
        return prev;
      }
      return { ...prev, schedule_label_id: nextDefaultLabelId };
    });

    setSelectedLabelIds((prev) => {
      const alive = prev.filter((id) => payload.some((label) => label.id === id));
      if (alive.length > 0) {
        return alive;
      }
      return payload.map((label) => label.id);
    });
  }, []);

  const loadSchedules = useCallback(async () => {
    const payload = await FetchBuilder.get().url(listScheduleApi).execute<ScheduleListResponse | { error?: string }>();

    if (!("items" in payload)) {
      throw new Error(payload.error ?? "일정 조회 실패");
    }

    setScheduleItems(payload.items);
  }, [listScheduleApi]);

  const loadBaseData = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");

    try {
      await Promise.all([loadShiftTypes(), loadPatterns(), loadLabels()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "초기 데이터 로드 실패";
      setStatusMessage(message);
    } finally {
      setLoading(false);
    }
  }, [loadLabels, loadPatterns, loadShiftTypes]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    let cancelled = false;

    const loadPublicHolidays = async () => {
      const targets = collectYearMonthTargets(range.start, range.end);
      if (targets.length === 0) {
        if (!cancelled) {
          setPublicHolidayDateSet(new Set());
          setPublicHolidayNameMap({});
        }
        return;
      }

      try {
        const responses = await Promise.all(
          targets.map(({ year, month }) =>
            FetchBuilder.get()
              .url(`/api/sardi/holidays/public?year=${year}&month=${String(month).padStart(2, "0")}`)
              .execute<PublicHolidayListResponse | { error?: string }>()
          )
        );

        if (cancelled) {
          return;
        }

        const nextDates = new Set<string>();
        const nextNameMap: Record<string, string> = {};
        for (const payload of responses) {
          if (!("items" in payload)) {
            throw new Error(payload.error ?? "공휴일 조회 실패");
          }

          for (const item of payload.items) {
            if (!item.is_holiday) {
              continue;
            }

            const raw = item.locdate?.trim();
            if (!raw || !/^\d{8}$/.test(raw)) {
              continue;
            }

            const dateKey = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
            nextDates.add(dateKey);

            const dateName = item.date_name?.trim();
            if (dateName && !nextNameMap[dateKey]) {
              nextNameMap[dateKey] = dateName;
            }
          }
        }

        setPublicHolidayDateSet(nextDates);
        setPublicHolidayNameMap(nextNameMap);
      } catch (error) {
        if (!cancelled) {
          console.error("public holiday GET error:", error);
        }
      }
    };

    void loadPublicHolidays();
    return () => {
      cancelled = true;
    };
  }, [range.end, range.start]);

  const handleToggleLabel = (labelId: string, checked: boolean) => {
    setSelectedLabelIds((prev) => {
      if (checked) {
        if (prev.includes(labelId)) {
          return prev;
        }
        return [...prev, labelId];
      }

      return prev.filter((id) => id !== labelId);
    });
  };

  const closeLabelModal = useCallback(() => {
    setIsLabelModalOpen(false);
    setLabelModalTargetId(null);
    setLabelModalForm({
      name: "",
      color: DEFAULT_LABEL_COLOR
    });
  }, []);

  const openCreateLabelModal = () => {
    setLabelModalTargetId(null);
    setLabelModalForm({
      name: "",
      color: DEFAULT_LABEL_COLOR
    });
    setIsLabelModalOpen(true);
    setStatusMessage("");
  };

  const openEditLabelModal = (label: ScheduleLabel) => {
    setLabelModalTargetId(label.id);
    setLabelModalForm({
      name: label.name,
      color: normalizeHexColor(label.color) || DEFAULT_LABEL_COLOR
    });
    setIsLabelModalOpen(true);
    setStatusMessage("");
  };

  const handleSubmitLabelModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = labelModalForm.name.trim();
    const color = normalizeHexColor(labelModalForm.color);

    if (!name) {
      setStatusMessage("라벨 이름을 입력하세요.");
      return;
    }

    if (!color) {
      setStatusMessage("라벨 색상은 #RRGGBB 형식이어야 합니다.");
      return;
    }

    setStatusMessage("");

    try {
      const editingLabelId = labelModalTargetId;
      const payload = editingLabelId
        ? await FetchBuilder.patch()
            .url(`/api/sardi/schedule-labels/${encodeURIComponent(editingLabelId)}`)
            .body({ name, color })
            .execute<{ id?: string; error?: string }>()
        : await FetchBuilder.post()
            .url("/api/sardi/schedule-labels")
            .body({ name, color })
            .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? (editingLabelId ? "라벨 수정 실패" : "라벨 등록 실패"));
      }

      const createdLabelId = payload.id;
      await Promise.all([loadLabels(), loadSchedules()]);
      if (!editingLabelId && createdLabelId) {
        setSelectedLabelIds((prev) => (prev.includes(createdLabelId) ? prev : [...prev, createdLabelId]));
      }
      closeLabelModal();
      setStatusMessage(editingLabelId ? "라벨을 수정했습니다." : "라벨을 등록했습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "라벨 저장 실패");
    }
  };

  const openConfirmDialog = useCallback(
    (dialog: Omit<ConfirmDialogState, "open">, onConfirm: () => Promise<void> | void, onCancel?: () => void) => {
      confirmActionRef.current = onConfirm;
      cancelActionRef.current = onCancel ?? null;
      setConfirmDialog({
        open: true,
        title: dialog.title,
        message: dialog.message,
        confirmText: dialog.confirmText,
        tone: dialog.tone
      });
    },
    []
  );

  const closeConfirmDialog = useCallback((runCancel: boolean) => {
    if (runCancel) {
      cancelActionRef.current?.();
    }
    confirmActionRef.current = null;
    cancelActionRef.current = null;
    setConfirmDialog((prev) => ({ ...prev, open: false }));
    setConfirmDialogBusy(false);
  }, []);

  const handleConfirmDialogSubmit = async () => {
    const action = confirmActionRef.current;
    if (!action || confirmDialogBusy) {
      return;
    }

    setConfirmDialogBusy(true);
    try {
      await action();
      closeConfirmDialog(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "요청 처리 실패";
      setStatusMessage(message);
      setConfirmDialogBusy(false);
    }
  };

  const handleDeleteLabelFromModal = () => {
    if (!labelModalTargetId) {
      return;
    }

    const targetId = labelModalTargetId;
    const targetName = labelModalForm.name.trim() || "선택 라벨";

    openConfirmDialog(
      {
        title: "라벨 삭제 경고",
        message: `${targetName} 라벨을 삭제하면 이 라벨이 연결된 일정도 모두 함께 삭제됩니다. 계속하시겠습니까?`,
        confirmText: "삭제 진행",
        tone: "danger"
      },
      async () => {
        const payload = await FetchBuilder.delete()
          .url(`/api/sardi/schedule-labels/${encodeURIComponent(targetId)}`)
          .execute<{ deleted?: boolean; deleted_schedule_count?: number; error?: string }>();

        if (!payload.deleted) {
          throw new Error(payload.error ?? "라벨 삭제 실패");
        }

        await Promise.all([loadLabels(), loadSchedules()]);
        closeLabelModal();
        const deletedScheduleCount = Number.isFinite(payload.deleted_schedule_count)
          ? Number(payload.deleted_schedule_count)
          : 0;
        setStatusMessage(
          deletedScheduleCount > 0
            ? `라벨과 연관 일정 ${deletedScheduleCount}건을 삭제했습니다.`
            : "라벨을 삭제했습니다."
        );
      }
    );
  };

  const createManualSchedule = useCallback(
    async (startTs: string, endTs: string, allDay: boolean, memoPayload: Record<string, unknown>) => {
      const payload = await FetchBuilder.post()
        .url("/api/sardi/schedules")
        .body({
          schedule_type_id: manualForm.schedule_type_id,
          schedule_label_id: manualForm.schedule_label_id,
          title: manualForm.title.trim(),
          start_ts: startTs,
          end_ts: endTs,
          all_day: allDay,
          memo: memoPayload
        })
        .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? "일반 일정 생성 실패");
      }
    },
    [manualForm.schedule_label_id, manualForm.schedule_type_id, manualForm.title]
  );

  const handleCreateManualSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!manualForm.schedule_type_id) {
      setStatusMessage("근무 타입 템플릿이 없어 등록할 수 없습니다.");
      return;
    }
    if (!manualForm.schedule_label_id) {
      setStatusMessage("라벨을 선택하세요.");
      return;
    }
    if (!manualForm.title.trim()) {
      setStatusMessage("제목을 입력하세요.");
      return;
    }

    const repeatCount = manualForm.repeat_enabled ? Number(manualForm.repeat_count) : 1;
    if (!Number.isInteger(repeatCount) || repeatCount <= 0 || repeatCount > 365) {
      setStatusMessage("반복 횟수는 1~365 사이여야 합니다.");
      return;
    }

    const startDate = dayjs(manualForm.start_date);
    const endDate = dayjs(manualForm.end_date);

    if (!startDate.isValid() || !endDate.isValid()) {
      setStatusMessage("날짜 형식이 올바르지 않습니다.");
      return;
    }

    if (endDate.isBefore(startDate)) {
      setStatusMessage("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
      return;
    }

    let baseStart: Dayjs;
    let baseEnd: Dayjs;

    if (manualForm.all_day) {
      const endExclusive = endDate.add(1, "day").format("YYYY-MM-DD");
      baseStart = dayjs(`${startDate.format("YYYY-MM-DD")}T00:00:00${SEOUL_OFFSET}`);
      baseEnd = dayjs(`${endExclusive}T00:00:00${SEOUL_OFFSET}`);
    } else {
      const start = dayjs(toIsoWithOffset(startDate.format("YYYY-MM-DD"), manualForm.start_time));
      const end = dayjs(toIsoWithOffset(endDate.format("YYYY-MM-DD"), manualForm.end_time));
      if (!start.isValid() || !end.isValid()) {
        setStatusMessage("시간 형식이 올바르지 않습니다.");
        return;
      }
      if (!end.isAfter(start)) {
        setStatusMessage("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
      }

      baseStart = start;
      baseEnd = end;
    }

    setStatusMessage("");

    try {
      const trimmedNote = manualForm.memo.trim();

      for (let index = 0; index < repeatCount; index += 1) {
        const repeatedStart = addByRepeatUnit(baseStart, manualForm.repeat_unit, index);
        const repeatedEnd = addByRepeatUnit(baseEnd, manualForm.repeat_unit, index);

        const memoPayload: Record<string, unknown> = {};
        if (trimmedNote) {
          memoPayload.format = "markdown";
          memoPayload.note = trimmedNote;
        }
        if (manualForm.repeat_enabled) {
          memoPayload.source = {
            type: "manual_repeat",
            repeat_unit: manualForm.repeat_unit,
            repeat_count: repeatCount,
            repeat_index: index + 1
          };
        }

        await createManualSchedule(
          repeatedStart.format("YYYY-MM-DDTHH:mm:ssZ"),
          repeatedEnd.format("YYYY-MM-DDTHH:mm:ssZ"),
          manualForm.all_day,
          memoPayload
        );
      }

      setManualForm((prev) => ({
        ...prev,
        title: "",
        memo: "",
        repeat_enabled: false,
        repeat_unit: "week",
        repeat_count: 1
      }));
      await loadSchedules();
      setStatusMessage(
        manualForm.repeat_enabled
          ? `일반 반복 일정 ${repeatCount}건이 등록되었습니다.`
          : "일반 스케줄이 등록되었습니다."
      );
      setIsManualModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "일반 일정 생성 실패";
      setStatusMessage(message);
    }
  };

  const handleOpenManualModal = ({ start, end, allDay }: { start: Date; end: Date; allDay: boolean }) => {
    const startDate = dayjs(start).tz(SEOUL_TZ);
    const rawEnd = dayjs(end).tz(SEOUL_TZ);
    const finalEnd = allDay ? rawEnd.subtract(1, "day") : rawEnd;

    if (!rawEnd.isAfter(startDate)) {
      setStatusMessage("선택 범위가 올바르지 않습니다.");
      return;
    }

    setManualForm((prev) => ({
      ...prev,
      start_date: startDate.format("YYYY-MM-DD"),
      end_date: finalEnd.format("YYYY-MM-DD"),
      all_day: allDay,
      start_time: startDate.format("HH:mm"),
      end_time: finalEnd.format("HH:mm")
    }));
    setPatternForm((prev) => ({
      ...prev,
      start_date: startDate.format("YYYY-MM-DD")
    }));
    setRegisterMode("manual");
    setIsManualModalOpen(true);
    setStatusMessage("");
  };

  const handleCreatePatternSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patternForm.pattern_id) {
      setStatusMessage("패턴을 선택하세요.");
      return;
    }
    if (!patternForm.schedule_label_id) {
      setStatusMessage("라벨을 선택하세요.");
      return;
    }

    if (patternForm.repeat_count <= 0 || patternForm.repeat_count > 365) {
      setStatusMessage("반복 횟수는 1~365 사이여야 합니다.");
      return;
    }

    setStatusMessage("");

    try {
      const selectedPatternName = patterns.find((item) => item.id === patternForm.pattern_id)?.name ?? "";
      const patternMemoPayload: Record<string, unknown> = {
        source: {
          type: "pattern_generate",
          pattern_id: patternForm.pattern_id,
          pattern_name: selectedPatternName,
          repeat_unit: "cycle",
          repeat_count: Number(patternForm.repeat_count)
        }
      };
      if (patternForm.memo.trim()) {
        patternMemoPayload.format = "markdown";
        patternMemoPayload.note = patternForm.memo.trim();
      }

      const payload = await FetchBuilder.post()
        .url("/api/sardi/schedules/generate")
        .body({
          pattern_id: patternForm.pattern_id,
          schedule_label_id: patternForm.schedule_label_id,
          start_date: patternForm.start_date,
          repeat_unit: "cycle",
          repeat_count: Number(patternForm.repeat_count),
          memo: patternMemoPayload
        })
        .execute<{ group_id?: string; inserted_count?: number; error?: string }>();

      if (!payload.group_id) {
        throw new Error(payload.error ?? "패턴 일정 생성 실패");
      }

      setPatternForm((prev) => ({ ...prev, memo: "" }));
      await loadSchedules();
      setStatusMessage(`패턴 일정 ${payload.inserted_count ?? 0}건 생성 완료`);
      setIsManualModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "패턴 일정 생성 실패";
      setStatusMessage(message);
    }
  };

  const updateScheduleRange = useCallback(
    async (scheduleId: string, start: Date, end: Date, allDay: boolean, options?: { detachedFromGroup?: boolean }) => {
      const payload = await FetchBuilder.patch()
        .url(`/api/sardi/schedules/${encodeURIComponent(scheduleId)}`)
        .body({
          start_ts: dayjs(start).tz(SEOUL_TZ).format("YYYY-MM-DDTHH:mm:ssZ"),
          end_ts: dayjs(end).tz(SEOUL_TZ).format("YYYY-MM-DDTHH:mm:ssZ"),
          all_day: allDay
        })
        .execute<{ id?: string; error?: string }>();

      if (!payload.id) {
        throw new Error(payload.error ?? "일정 이동/리사이즈 실패");
      }

      await loadSchedules();
      setStatusMessage(
        options?.detachedFromGroup
          ? "일정 시간이 업데이트되었고 반복 그룹에서 제외되었습니다."
          : "일정 시간이 업데이트되었습니다."
      );
    },
    [loadSchedules]
  );

  const handleEventDrop = async (arg: {
    event: { id: string; start: Date | null; end: Date | null; allDay: boolean };
    revert: () => void;
  }) => {
    const { event } = arg;
    if (!event.start) {
      arg.revert();
      setStatusMessage("일정 시작 시간이 비어 있어 이동을 취소했습니다.");
      return;
    }

    const end =
      event.end ??
      dayjs(event.start)
        .add(event.allDay ? 1 : 1, event.allDay ? "day" : "hour")
        .toDate();
    if (!dayjs(end).isAfter(dayjs(event.start))) {
      arg.revert();
      setStatusMessage("이동 후 종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }

    const target = scheduleItems.find((item) => item.id === event.id);
    const detachedFromGroup = Boolean(target?.group_id);

    const runUpdate = async () => {
      try {
        await updateScheduleRange(event.id, event.start as Date, end, event.allDay, { detachedFromGroup });
      } catch (error) {
        arg.revert();
        const message = error instanceof Error ? error.message : "일정 이동 실패";
        setStatusMessage(message);
      }
    };

    if (detachedFromGroup) {
      openConfirmDialog(
        {
          title: "반복 일정 그룹 해제",
          message: "반복 일정의 날짜/시간을 이동하면 해당 일정은 반복 그룹에서 제외됩니다. 계속하시겠습니까?",
          confirmText: "계속 이동",
          tone: "warning"
        },
        runUpdate,
        () => {
          arg.revert();
          setStatusMessage("일정 이동을 취소했습니다.");
        }
      );
      return;
    }

    try {
      await runUpdate();
    } catch (error) {
      arg.revert();
      const message = error instanceof Error ? error.message : "일정 이동 실패";
      setStatusMessage(message);
    }
  };

  const handleEventResize = async (arg: {
    event: { id: string; start: Date | null; end: Date | null; allDay: boolean };
    revert: () => void;
  }) => {
    const { event } = arg;
    if (!event.start || !event.end) {
      arg.revert();
      setStatusMessage("리사이즈 범위가 올바르지 않아 취소했습니다.");
      return;
    }

    if (!dayjs(event.end).isAfter(dayjs(event.start))) {
      arg.revert();
      setStatusMessage("종료 시간이 시작 시간보다 늦어야 합니다.");
      return;
    }

    const target = scheduleItems.find((item) => item.id === event.id);
    const detachedFromGroup = Boolean(target?.group_id);

    const runUpdate = async () => {
      try {
        await updateScheduleRange(event.id, event.start as Date, event.end as Date, event.allDay, {
          detachedFromGroup
        });
      } catch (error) {
        arg.revert();
        const message = error instanceof Error ? error.message : "일정 리사이즈 실패";
        setStatusMessage(message);
      }
    };

    if (detachedFromGroup) {
      openConfirmDialog(
        {
          title: "반복 일정 그룹 해제",
          message: "반복 일정의 날짜/시간을 변경하면 해당 일정은 반복 그룹에서 제외됩니다. 계속하시겠습니까?",
          confirmText: "계속 변경",
          tone: "warning"
        },
        runUpdate,
        () => {
          arg.revert();
          setStatusMessage("일정 리사이즈를 취소했습니다.");
        }
      );
      return;
    }

    try {
      await runUpdate();
    } catch (error) {
      arg.revert();
      const message = error instanceof Error ? error.message : "일정 리사이즈 실패";
      setStatusMessage(message);
    }
  };

  const loadRepeatGroupSchedules = useCallback(async (groupId: string) => {
    setRepeatGroupLoading(true);
    try {
      const payload = await FetchBuilder.get()
        .url(`/api/sardi/schedule-groups/${encodeURIComponent(groupId)}`)
        .execute<ScheduleGroupDetailResponse | { error?: string }>();

      if (!("items" in payload)) {
        throw new Error(payload.error ?? "반복 일정 목록 조회 실패");
      }

      const sorted = [...payload.items].sort(
        (left, right) => dayjs(left.start_ts).valueOf() - dayjs(right.start_ts).valueOf()
      );
      setRepeatGroupItems(sorted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "반복 일정 목록 조회 실패";
      setStatusMessage(message);
      setRepeatGroupItems([]);
    } finally {
      setRepeatGroupLoading(false);
    }
  }, []);

  const openScheduleDetailItem = useCallback(
    (item: ScheduleItem, options?: { collapseRepeatList?: boolean }) => {
      setSelectedSchedule(item);
      setDetailForm(toScheduleDetailForm(item));
      setIsDetailEditMode(false);
      if (options?.collapseRepeatList ?? true) {
        setRepeatGroupExpanded(false);
      }

      if (item.group_id) {
        void loadRepeatGroupSchedules(item.group_id);
      } else {
        setRepeatGroupItems([]);
        setRepeatGroupLoading(false);
      }
    },
    [loadRepeatGroupSchedules]
  );

  const closeScheduleDetail = () => {
    closeConfirmDialog(false);
    setSelectedSchedule(null);
    setIsDetailEditMode(false);
    setRepeatGroupItems([]);
    setRepeatGroupLoading(false);
    setRepeatGroupExpanded(false);
  };

  const cancelScheduleDetailEdit = () => {
    if (selectedSchedule) {
      setDetailForm(toScheduleDetailForm(selectedSchedule));
    }
    setIsDetailEditMode(false);
  };

  const handleSaveScheduleDetail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSchedule) {
      return;
    }

    if (!detailForm.title.trim()) {
      setStatusMessage("제목을 입력하세요.");
      return;
    }

    if (!detailForm.schedule_label_id) {
      setStatusMessage("라벨을 선택하세요.");
      return;
    }

    const startDate = dayjs(detailForm.start_date);
    const endDate = dayjs(detailForm.end_date);
    if (!startDate.isValid() || !endDate.isValid()) {
      setStatusMessage("날짜 형식이 올바르지 않습니다.");
      return;
    }
    if (endDate.isBefore(startDate)) {
      setStatusMessage("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
      return;
    }

    let startTs = "";
    let endTs = "";

    if (detailForm.all_day) {
      const endExclusive = endDate.add(1, "day").format("YYYY-MM-DD");
      startTs = `${startDate.format("YYYY-MM-DD")}T00:00:00${SEOUL_OFFSET}`;
      endTs = `${endExclusive}T00:00:00${SEOUL_OFFSET}`;
    } else {
      const start = dayjs(toIsoWithOffset(startDate.format("YYYY-MM-DD"), detailForm.start_time));
      const end = dayjs(toIsoWithOffset(endDate.format("YYYY-MM-DD"), detailForm.end_time));
      if (!start.isValid() || !end.isValid()) {
        setStatusMessage("시간 형식이 올바르지 않습니다.");
        return;
      }
      if (!end.isAfter(start)) {
        setStatusMessage("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
      }
      startTs = start.format("YYYY-MM-DDTHH:mm:ssZ");
      endTs = end.format("YYYY-MM-DDTHH:mm:ssZ");
    }

    const currentMemoSource =
      selectedSchedule.memo &&
      typeof selectedSchedule.memo === "object" &&
      !Array.isArray(selectedSchedule.memo) &&
      (selectedSchedule.memo as Record<string, unknown>).source &&
      typeof (selectedSchedule.memo as Record<string, unknown>).source === "object" &&
      !Array.isArray((selectedSchedule.memo as Record<string, unknown>).source)
        ? ((selectedSchedule.memo as Record<string, unknown>).source as Record<string, unknown>)
        : null;

    const memoPayload: Record<string, unknown> = {};
    if (detailForm.memo.trim()) {
      memoPayload.format = "markdown";
      memoPayload.note = detailForm.memo.trim();
    }
    if (currentMemoSource) {
      memoPayload.source = currentMemoSource;
    }

    const detachedFromGroup =
      Boolean(selectedSchedule.group_id) &&
      hasScheduleRangeChanged(selectedSchedule, startTs, endTs, detailForm.all_day);

    const runSave = async () => {
      setStatusMessage("");
      setIsDetailSaving(true);

      try {
        const payload = await FetchBuilder.patch()
          .url(`/api/sardi/schedules/${encodeURIComponent(selectedSchedule.id)}`)
          .body({
            title: detailForm.title.trim(),
            schedule_label_id: detailForm.schedule_label_id,
            start_ts: startTs,
            end_ts: endTs,
            all_day: detailForm.all_day,
            memo: memoPayload
          })
          .execute<ScheduleItem | { error?: string; id?: string }>();

        if (!("id" in payload) || !payload.id) {
          const errorMessage =
            "error" in payload && typeof payload.error === "string" ? payload.error : "일정 수정 실패";
          throw new Error(errorMessage);
        }

        const updatedItem = payload as ScheduleItem;
        openScheduleDetailItem(updatedItem);
        await loadSchedules();
        setStatusMessage(detachedFromGroup ? "일정을 수정했고 반복 그룹에서 제외했습니다." : "일정을 수정했습니다.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "일정 수정 실패";
        setStatusMessage(message);
      } finally {
        setIsDetailSaving(false);
      }
    };

    if (detachedFromGroup) {
      openConfirmDialog(
        {
          title: "반복 일정 그룹 해제",
          message: "반복 일정의 날짜/시간을 변경하면 해당 일정은 반복 그룹에서 제외됩니다. 계속하시겠습니까?",
          confirmText: "계속 수정",
          tone: "warning"
        },
        runSave
      );
      return;
    }

    await runSave();
  };

  const requestDeleteSchedule = () => {
    if (!selectedSchedule) {
      return;
    }

    openConfirmDialog(
      {
        title: "일정 삭제",
        message: "선택한 일정을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.",
        confirmText: "삭제",
        tone: "danger"
      },
      async () => {
        const payload = await FetchBuilder.delete()
          .url(`/api/sardi/schedules/${encodeURIComponent(selectedSchedule.id)}`)
          .execute<{ deleted?: boolean; error?: string }>();

        if (!payload.deleted) {
          throw new Error(payload.error ?? "일정 삭제 실패");
        }

        closeScheduleDetail();
        await loadSchedules();
        setStatusMessage("일정을 삭제했습니다.");
      }
    );
  };

  const requestDeleteScheduleGroup = () => {
    if (!selectedSchedule?.group_id) {
      return;
    }

    const groupId = selectedSchedule.group_id;
    openConfirmDialog(
      {
        title: "반복 일정 전체 삭제",
        message: "이 반복 그룹에 포함된 모든 일정을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.",
        confirmText: "전체 삭제",
        tone: "danger"
      },
      async () => {
        const payload = await FetchBuilder.delete()
          .url(`/api/sardi/schedule-groups/${encodeURIComponent(groupId)}`)
          .execute<{ deleted?: boolean; deleted_schedule_count?: number; error?: string }>();

        if (!payload.deleted) {
          throw new Error(payload.error ?? "반복 일정 전체 삭제 실패");
        }

        const deletedCount = Number.isFinite(payload.deleted_schedule_count) ? Number(payload.deleted_schedule_count) : 0;
        closeScheduleDetail();
        await loadSchedules();
        setStatusMessage(
          deletedCount > 0 ? `반복 일정 ${deletedCount}건을 삭제했습니다.` : "반복 일정을 삭제했습니다."
        );
      }
    );
  };

  const handleOpenScheduleDetail = (scheduleId: string) => {
    const item = scheduleItems.find((value) => value.id === scheduleId);
    if (!item) {
      setStatusMessage("일정 정보를 찾지 못했습니다.");
      return;
    }

    openScheduleDetailItem(item);
  };

  return (
    <div className="space-y-4">
      <TopNavbar current="dashboard" title="교대 스케줄 대시보드" onLogout={() => void logout()} />

      {statusMessage ? (
        <div className="rounded-xl border border-cyan-300/30 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100">
          {statusMessage}
        </div>
      ) : null}

      <section
        className={`grid gap-4 p-0 md:min-h-[calc(100dvh-11.5rem)] ${
          isFilterColorOnly
            ? "md:grid-cols-[minmax(0,1fr)_84px] lg:grid-cols-[minmax(0,1fr)_90px] xl:grid-cols-[minmax(0,1fr)_96px]"
            : "md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]"
        }`}>
        <div className="flex min-h-[100dvh] flex-col md:h-full md:min-h-0">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsWeekendHolidayThemeEnabled((prev) => !prev)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-cyan-300/35 px-2 text-[11px] text-cyan-100"
              aria-label={isWeekendHolidayThemeEnabled ? "토일 공휴일 테마 끄기" : "토일 공휴일 테마 켜기"}
              title={isWeekendHolidayThemeEnabled ? "토일/공휴일 테마 ON" : "토일/공휴일 테마 OFF"}>
              <CalendarDayIcon />
              <span>{isWeekendHolidayThemeEnabled ? "토일·공휴일 ON" : "토일·공휴일 OFF"}</span>
            </button>
          </div>
          <div
            className={`min-h-[calc(100dvh-12rem)] flex-1 md:min-h-0 ${
              isWeekendHolidayThemeEnabled ? "" : "calendar-weekend-holiday-theme-off"
            }`}>
            <FullCalendar
              ref={calendarRef}
              plugins={[luxonPlugin, multiMonthPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              timeZone={SEOUL_TZ}
              locale="ko"
              height="100%"
              selectable
              selectMirror
              editable
              eventStartEditable
              eventDurationEditable
              longPressDelay={300}
              selectLongPressDelay={300}
              eventLongPressDelay={300}
              eventMinHeight={20}
              events={filteredEvents}
              eventClick={(arg) => {
                // 모바일에서는 드래그 중 클릭 이벤트 방지
                if (arg.jsEvent.type === "touchend" && window.innerWidth < 768) {
                  const rawTouchStartTime = arg.el.dataset.touchStartTime;
                  const touchStartTime = rawTouchStartTime ? Number(rawTouchStartTime) : NaN;
                  const touchDuration = Number.isFinite(touchStartTime) ? Date.now() - touchStartTime : 0;
                  if (touchDuration > 300) {
                    return; // 길게 누른 경우에는 클릭 이벤트 무시
                  }
                }
                handleOpenScheduleDetail(arg.event.id);
              }}
              eventDidMount={(info) => {
                // 모바일 터치 이벤트 시간 기록
                if (window.innerWidth < 768) {
                  const handleTouchStart = () => {
                    info.el.dataset.touchStartTime = String(Date.now());
                  };

                  info.el.addEventListener("touchstart", handleTouchStart, { passive: true });
                }
              }}
              handleWindowResize={true}
              windowResizeDelay={100}
              buttonText={{
                today: "오늘",
                multiMonthYear: "년",
                month: "월",
                week: "주",
                day: "일"
              }}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay"
              }}
              datesSet={(arg) => {
                const start = arg.view.currentStart;
                const end = arg.view.currentEnd;
                setRange({
                  start: dayjs(start).toISOString(),
                  end: dayjs(end).toISOString()
                });
              }}
              select={(arg) => {
                void handleOpenManualModal({
                  start: arg.start,
                  end: arg.end,
                  allDay: arg.allDay
                });
              }}
              eventDrop={(arg) => {
                void handleEventDrop({
                  event: {
                    id: arg.event.id,
                    start: arg.event.start,
                    end: arg.event.end,
                    allDay: arg.event.allDay
                  },
                  revert: arg.revert
                });
              }}
              eventResize={(arg) => {
                void handleEventResize({
                  event: {
                    id: arg.event.id,
                    start: arg.event.start,
                    end: arg.event.end,
                    allDay: arg.event.allDay
                  },
                  revert: arg.revert
                });
              }}
              dayCellClassNames={(arg) => getHolidayClasses(arg.date)}
              dayHeaderClassNames={(arg) => getHolidayClasses(arg.date)}
              dayCellContent={renderDayCellContent}
              dayMaxEvents={3}
              views={{
                multiMonthYear: {
                  multiMonthMinWidth: 220
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-3 p-0 md:max-h-full md:overflow-y-auto">
          <div className="space-y-1 rounded-lg border border-teal-200/10 bg-black/20 p-2">
            <label className="text-xs text-cyan-100/80">일정 검색 (제목/메모)</label>
            <div className="flex items-center gap-1">
              <input
                value={scheduleSearchInput}
                onChange={(event) => setScheduleSearchInput(event.target.value)}
                className="h-8 w-full rounded-md border border-cyan-300/35 bg-cyan-950/20 px-2 text-xs text-cyan-50 placeholder:text-cyan-100/45"
                placeholder="검색어 입력"
              />
              {scheduleSearchInput ? (
                <button
                  type="button"
                  onClick={() => setScheduleSearchInput("")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-300/35 text-cyan-100"
                  aria-label="검색어 지우기"
                  title="검색어 지우기">
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          </div>

          <div className={isFilterColorOnly ? "space-y-1" : "flex items-center justify-between gap-2"}>
            <h2 className={`${isFilterColorOnly ? "text-xs" : "text-sm"} font-semibold`}>라벨 필터</h2>
            <button
              type="button"
              onClick={() => setIsFilterColorOnly((prev) => !prev)}
              className="hidden h-8 w-8 items-center justify-center rounded-md border border-cyan-300/35 text-cyan-100 md:inline-flex"
              aria-label={isFilterColorOnly ? "기본 보기로 전환" : "색상만 보기로 전환"}
              title={isFilterColorOnly ? "기본 보기" : "색상만 보기"}>
              {isFilterColorOnly ? <ListIcon /> : <PaletteIcon />}
            </button>
          </div>

          {isFilterColorOnly ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedLabelIds(labels.map((label) => label.id))}
                  className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100">
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabelIds([])}
                  className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100">
                  해제
                </button>
              </div>
              <div className="max-h-[58dvh] grid grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-teal-200/10 bg-black/20 p-2">
                {labels.length === 0 ? (
                  <p className="text-xs text-cyan-100/70">라벨 없음</p>
                ) : (
                  labels.map((label) => {
                    const checked = selectedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        title={label.name}
                        onClick={() => handleToggleLabel(label.id, !checked)}
                        className={`flex h-8 w-full items-center rounded-md border px-1 ${
                          checked ? "border-cyan-300/65" : "border-teal-200/20"
                        }`}>
                        <span
                          className={`inline-block h-4 w-full rounded-sm ${checked ? "" : "opacity-50"}`}
                          style={{ backgroundColor: normalizeHexColor(label.color) || DEFAULT_LABEL_COLOR }}
                        />
                        <span className="sr-only">{label.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={openCreateLabelModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-teal-300/40 text-teal-100"
                  aria-label="라벨 등록"
                  title="라벨 등록">
                  <PlusIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabelIds(labels.map((label) => label.id))}
                  className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100">
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabelIds([])}
                  className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100">
                  해제
                </button>
              </div>

              <div className="max-h-[58dvh] space-y-2 overflow-y-auto rounded-lg border border-teal-200/10 bg-black/20 p-2">
                {labels.length === 0 ? (
                  <p className="text-xs text-cyan-100/70">등록된 라벨이 없습니다.</p>
                ) : (
                  labels.map((label) => {
                    const checked = selectedLabelIds.includes(label.id);
                    return (
                      <div
                        key={label.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-teal-200/10 px-2 py-2">
                        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-cyan-100">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => handleToggleLabel(label.id, event.target.checked)}
                          />
                          <span
                            className="inline-block h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-teal-50">{label.name}</span>
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => openEditLabelModal(label)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-300/35 text-cyan-100"
                          aria-label={`${label.name} 라벨 수정`}
                          title="수정">
                          <EditIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {isManualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-1 md:items-center md:p-3">
          <div className="max-h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-teal-200/30 bg-[#031718] p-4 md:max-h-[92dvh] md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cyan-50">
                {registerMode === "manual" ? "일반 스케줄 등록" : "패턴 스케줄 등록"}
              </h2>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-200/30 text-cyan-100"
                aria-label="등록 모달 닫기"
                title="닫기">
                <CloseIcon />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRegisterMode("manual")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  registerMode === "manual"
                    ? "bg-teal-300 text-teal-950"
                    : "border border-teal-100/20 bg-teal-950/30 text-teal-100/80"
                }`}>
                일반 스케줄
              </button>
              <button
                type="button"
                onClick={() => setRegisterMode("pattern")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  registerMode === "pattern"
                    ? "bg-cyan-300 text-cyan-950"
                    : "border border-teal-100/20 bg-teal-950/30 text-teal-100/80"
                }`}>
                패턴 등록
              </button>
            </div>

            {registerMode === "manual" ? (
              <form onSubmit={handleCreateManualSchedule} className="space-y-3">
                <input
                  value={manualForm.title}
                  onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
                  placeholder="제목"
                />

                <DropdownSelect
                  options={labelOptions}
                  value={manualForm.schedule_label_id}
                  onChange={(nextValue) => setManualForm((prev) => ({ ...prev, schedule_label_id: nextValue }))}
                  tone="teal"
                  placeholder="라벨 선택"
                />

                <div className="space-y-2 rounded-lg border border-teal-100/15 bg-teal-950/15 p-3">
                  <p className="text-xs font-semibold text-teal-100/80">시작 - 종료 날짜 설정</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-teal-100/60">시작</p>
                      <input
                        type="date"
                        value={manualForm.start_date}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, start_date: event.target.value }))}
                        className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-teal-100/60">종료</p>
                      <input
                        type="date"
                        value={manualForm.end_date}
                        onChange={(event) => setManualForm((prev) => ({ ...prev, end_date: event.target.value }))}
                        className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-teal-100/15 bg-teal-950/15 p-3">
                  <p className="text-xs font-semibold text-teal-100/80">시간 설정</p>
                  <label className="flex items-center gap-2 rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-xs text-teal-100/80">
                    <input
                      type="checkbox"
                      checked={manualForm.all_day}
                      onChange={(event) => setManualForm((prev) => ({ ...prev, all_day: event.target.checked }))}
                    />
                    종일 일정
                  </label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-teal-100/60">시작 시간</p>
                        <MobileTimePicker
                          ampm={false}
                          views={["hours", "minutes"]}
                          format="HH:mm"
                          disabled={manualForm.all_day}
                        value={toTimePickerValue(manualForm.start_time)}
                          onChange={(nextValue) => {
                            if (!nextValue || !nextValue.isValid()) {
                              return;
                            }
                            setManualForm((prev) => ({ ...prev, start_time: nextValue.format("HH:mm") }));
                          }}
                          slotProps={{
                            textField: {
                              className: "shift-time-picker-field",
                              fullWidth: true,
                              size: "small",
                            sx: timePickerFieldSx
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-teal-100/60">종료 시간</p>
                        <MobileTimePicker
                          ampm={false}
                          views={["hours", "minutes"]}
                          format="HH:mm"
                          disabled={manualForm.all_day}
                        value={toTimePickerValue(manualForm.end_time)}
                          onChange={(nextValue) => {
                            if (!nextValue || !nextValue.isValid()) {
                              return;
                            }
                            setManualForm((prev) => ({ ...prev, end_time: nextValue.format("HH:mm") }));
                          }}
                          slotProps={{
                            textField: {
                              className: "shift-time-picker-field",
                              fullWidth: true,
                              size: "small",
                            sx: timePickerFieldSx
                            }
                          }}
                        />
                      </div>
                    </div>
                  </LocalizationProvider>
                </div>

                <div className="space-y-2 rounded-lg border border-teal-100/15 bg-teal-950/15 p-3">
                  <label className="flex items-center gap-2 rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-xs text-teal-100/80">
                    <input
                      type="checkbox"
                      checked={manualForm.repeat_enabled}
                      onChange={(event) =>
                        setManualForm((prev) => ({
                          ...prev,
                          repeat_enabled: event.target.checked,
                          repeat_count: event.target.checked ? Math.max(prev.repeat_count, 1) : 1
                        }))
                      }
                    />
                    반복 일정으로 생성
                  </label>

                  {manualForm.repeat_enabled ? (
                    <div className="grid grid-cols-2 gap-2">
                      <DropdownSelect
                        options={repeatUnitOptions}
                        value={manualForm.repeat_unit}
                        onChange={(nextValue) =>
                          setManualForm((prev) => ({ ...prev, repeat_unit: nextValue as RepeatUnitValue }))
                        }
                        tone="teal"
                        placeholder="반복 단위 선택"
                      />
                      <NumberDropdown
                        value={manualForm.repeat_count}
                        min={1}
                        max={365}
                        tone="teal"
                        onChange={(nextValue) => setManualForm((prev) => ({ ...prev, repeat_count: nextValue }))}
                      />
                    </div>
                  ) : null}
                </div>

                <MarkdownEditor
                  value={manualForm.memo}
                  onChange={(nextValue) => setManualForm((prev) => ({ ...prev, memo: nextValue }))}
                  tone="teal"
                  placeholder="일정 메모를 Markdown으로 입력"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="rounded-lg border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100">
                    취소
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-300 px-3 py-2 text-sm font-bold text-teal-950">
                    <PlusIcon />
                    일반 일정 추가
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreatePatternSchedule} className="space-y-3">
                <DropdownSelect
                  options={patternOptions}
                  value={patternForm.pattern_id}
                  onChange={(nextValue) => setPatternForm((prev) => ({ ...prev, pattern_id: nextValue }))}
                  tone="cyan"
                  placeholder="패턴 선택"
                />

                <DropdownSelect
                  options={labelOptions}
                  value={patternForm.schedule_label_id}
                  onChange={(nextValue) => setPatternForm((prev) => ({ ...prev, schedule_label_id: nextValue }))}
                  tone="cyan"
                  placeholder="라벨 선택"
                />

                <input
                  type="date"
                  value={patternForm.start_date}
                  onChange={(event) => setPatternForm((prev) => ({ ...prev, start_date: event.target.value }))}
                  className="w-full rounded-lg border border-cyan-100/20 bg-cyan-950/30 px-3 py-2 text-sm"
                />

                <p className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2 text-xs text-cyan-100/75">
                  패턴 반복은 패턴 주기(cycle_days) 기준 횟수 반복으로 고정됩니다.
                </p>
                <NumberDropdown
                  value={patternForm.repeat_count}
                  min={1}
                  max={365}
                  tone="cyan"
                  onChange={(nextValue) => setPatternForm((prev) => ({ ...prev, repeat_count: nextValue }))}
                />

                <MarkdownEditor
                  value={patternForm.memo}
                  onChange={(nextValue) => setPatternForm((prev) => ({ ...prev, memo: nextValue }))}
                  tone="cyan"
                  placeholder="패턴 메모를 Markdown으로 입력"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="rounded-lg border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100">
                    취소
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950">
                    <PlusIcon />
                    패턴 일정 등록
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {isLabelModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3"
          onClick={closeLabelModal}>
          <div
            className="w-full max-w-md rounded-2xl border border-teal-200/30 bg-[#031718] p-4"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-teal-50">{isLabelEditMode ? "라벨 수정" : "라벨 등록"}</h2>
              <button
                type="button"
                onClick={closeLabelModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-200/30 text-cyan-100"
                aria-label="라벨 모달 닫기"
                title="닫기">
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitLabelModal} className="space-y-3">
              <input
                value={labelModalForm.name}
                onChange={(event) => setLabelModalForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="예: 휴일"
                className="w-full rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm text-teal-50"
              />

              <div className="grid grid-cols-[1fr_58px] gap-2">
                <input
                  value={labelModalForm.color}
                  onChange={(event) => setLabelModalForm((prev) => ({ ...prev, color: event.target.value }))}
                  placeholder="#EF4444"
                  className="rounded-lg border border-teal-100/20 bg-teal-950/30 px-3 py-2 text-sm uppercase text-teal-50"
                />
                <input
                  type="color"
                  value={normalizeHexColor(labelModalForm.color) || DEFAULT_LABEL_COLOR}
                  onChange={(event) => setLabelModalForm((prev) => ({ ...prev, color: event.target.value }))}
                  className="h-10 w-full cursor-pointer rounded-lg border border-teal-100/20 bg-teal-950/30 px-1"
                />
              </div>

              {isLabelEditMode ? (
                <button
                  type="button"
                  onClick={handleDeleteLabelFromModal}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-rose-300/40 px-3 py-2 text-sm text-rose-200">
                  <TrashIcon />
                  라벨 삭제
                </button>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeLabelModal}
                  className="rounded-lg border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100">
                  취소
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-teal-300 px-3 py-2 text-sm font-semibold text-teal-950">
                  <CheckIcon />
                  {isLabelEditMode ? "수정 저장" : "라벨 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedSchedule ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 p-3"
          onClick={closeScheduleDetail}>
          <div
            className="max-h-[96dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-cyan-200/30 bg-[#031718] p-4 md:max-h-[92dvh]"
            onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-cyan-50">일정 상세</h2>
              <div className="flex items-center gap-2">
                {isDetailEditMode ? (
                  <button
                    type="button"
                    onClick={cancelScheduleDetailEdit}
                    className="rounded-md border border-cyan-200/30 px-2 py-1 text-xs text-cyan-100">
                    편집 취소
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDetailEditMode(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-teal-300/45 text-teal-100"
                    aria-label="일정 수정"
                    title="수정">
                    <EditIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={requestDeleteSchedule}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-300/45 text-rose-200"
                  aria-label="일정 삭제"
                  title="삭제">
                  <TrashIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeScheduleDetail}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-cyan-200/30 text-cyan-100"
                  aria-label="일정 상세 닫기"
                  title="닫기">
                  <CloseIcon />
                </button>
              </div>
            </div>

            {isDetailEditMode ? (
              <form onSubmit={handleSaveScheduleDetail} className="space-y-3">
                <input
                  value={detailForm.title}
                  onChange={(event) => setDetailForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-cyan-100/20 bg-cyan-950/30 px-3 py-2 text-sm"
                  placeholder="제목"
                />

                <div className="space-y-2 rounded-lg border border-cyan-100/15 bg-cyan-950/15 p-3">
                  <p className="text-xs font-semibold text-cyan-100/80">시작 - 종료 날짜 설정</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-cyan-100/60">시작</p>
                      <input
                        type="date"
                        value={detailForm.start_date}
                        onChange={(event) => setDetailForm((prev) => ({ ...prev, start_date: event.target.value }))}
                        className="w-full rounded-lg border border-cyan-100/20 bg-cyan-950/30 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-cyan-100/60">종료</p>
                      <input
                        type="date"
                        value={detailForm.end_date}
                        onChange={(event) => setDetailForm((prev) => ({ ...prev, end_date: event.target.value }))}
                        className="w-full rounded-lg border border-cyan-100/20 bg-cyan-950/30 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-cyan-100/15 bg-cyan-950/15 p-3">
                  <p className="text-xs font-semibold text-cyan-100/80">시간 설정</p>
                  <label className="flex items-center gap-2 rounded-lg border border-cyan-100/20 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-100/80">
                    <input
                      type="checkbox"
                      checked={detailForm.all_day}
                      onChange={(event) => setDetailForm((prev) => ({ ...prev, all_day: event.target.checked }))}
                    />
                    종일 일정
                  </label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-cyan-100/60">시작 시간</p>
                        <MobileTimePicker
                          ampm={false}
                          views={["hours", "minutes"]}
                          format="HH:mm"
                          disabled={detailForm.all_day}
                        value={toTimePickerValue(detailForm.start_time)}
                          onChange={(nextValue) => {
                            if (!nextValue || !nextValue.isValid()) {
                              return;
                            }
                            setDetailForm((prev) => ({ ...prev, start_time: nextValue.format("HH:mm") }));
                          }}
                          slotProps={{
                            textField: {
                              className: "shift-time-picker-field",
                              fullWidth: true,
                              size: "small",
                            sx: timePickerFieldSx
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-cyan-100/60">종료 시간</p>
                        <MobileTimePicker
                          ampm={false}
                          views={["hours", "minutes"]}
                          format="HH:mm"
                          disabled={detailForm.all_day}
                        value={toTimePickerValue(detailForm.end_time)}
                          onChange={(nextValue) => {
                            if (!nextValue || !nextValue.isValid()) {
                              return;
                            }
                            setDetailForm((prev) => ({ ...prev, end_time: nextValue.format("HH:mm") }));
                          }}
                          slotProps={{
                            textField: {
                              className: "shift-time-picker-field",
                              fullWidth: true,
                              size: "small",
                            sx: timePickerFieldSx
                            }
                          }}
                        />
                      </div>
                    </div>
                  </LocalizationProvider>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-cyan-100/60">라벨</p>
                  <DropdownSelect
                    options={labelOptions}
                    value={detailForm.schedule_label_id}
                    onChange={(nextValue) => setDetailForm((prev) => ({ ...prev, schedule_label_id: nextValue }))}
                    tone="cyan"
                    placeholder="라벨 선택"
                  />
                </div>

                <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                  <p className="mb-1 text-[11px] text-cyan-100/60">반복/패턴 요약</p>
                  <p className="text-xs text-cyan-50">{extractRepeatSummary(selectedSchedule, patterns)}</p>
                </div>

                {selectedSchedule.group_id ? (
                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] text-cyan-100/60">반복 일정 목록</p>
                      {repeatGroupItems.length > 4 ? (
                        <button
                          type="button"
                          onClick={() => setRepeatGroupExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-1 rounded border border-cyan-300/35 px-2 py-0.5 text-[11px] text-cyan-100"
                          aria-label={repeatGroupExpanded ? "반복 일정 목록 접기" : "반복 일정 목록 더보기"}
                          title={repeatGroupExpanded ? "접기" : "더보기"}>
                          {repeatGroupExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          {!repeatGroupExpanded ? <span>+{hiddenRepeatGroupCount}</span> : null}
                        </button>
                      ) : null}
                    </div>

                    {repeatGroupLoading ? (
                      <p className="text-[11px] text-cyan-100/70">반복 일정 목록 로딩 중...</p>
                    ) : repeatGroupItems.length === 0 ? (
                      <p className="text-[11px] text-cyan-100/70">반복 일정이 없습니다.</p>
                    ) : (
                      <div className="max-h-[30dvh] space-y-1 overflow-y-auto pr-1">
                        {visibleRepeatGroupItems.map((groupItem) => {
                          const active = groupItem.id === selectedSchedule.id;
                          const timeText = groupItem.all_day
                            ? `${dayjs(groupItem.start_ts).tz(SEOUL_TZ).format("YYYY-MM-DD")} (종일)`
                            : dayjs(groupItem.start_ts).tz(SEOUL_TZ).format("YYYY-MM-DD HH:mm");
                          return (
                            <button
                              key={groupItem.id}
                              type="button"
                              onClick={() => openScheduleDetailItem(groupItem, { collapseRepeatList: false })}
                              className={`w-full rounded-lg border px-2 py-1.5 text-left ${
                                active ? "border-teal-300/55 bg-teal-900/25" : "border-cyan-100/10 bg-black/15"
                              }`}>
                              <p className="truncate text-xs text-cyan-50">
                                {groupItem.title?.trim() || groupItem.schedule_type_name}
                              </p>
                              <p className="text-[11px] text-cyan-100/70">{timeText}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                <MarkdownEditor
                  value={detailForm.memo}
                  onChange={(nextValue) => setDetailForm((prev) => ({ ...prev, memo: nextValue }))}
                  tone="cyan"
                  placeholder="메모를 Markdown으로 입력"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={cancelScheduleDetailEdit}
                    className="rounded-lg border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100"
                    disabled={isDetailSaving}>
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isDetailSaving}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-bold text-cyan-950 disabled:opacity-60">
                    {isDetailSaving ? null : <CheckIcon />}
                    {isDetailSaving ? "저장 중..." : "수정 저장"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[11px] text-cyan-100/60">제목</p>
                    <p className="text-cyan-50">
                      {selectedSchedule.title?.trim() || selectedSchedule.schedule_type_name}
                    </p>
                  </div>

                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[11px] text-cyan-100/60">기간</p>
                    <p className="text-cyan-50">
                      {selectedSchedule.all_day
                        ? (() => {
                            const start = dayjs(selectedSchedule.start_ts).tz(SEOUL_TZ);
                            const endInclusive = dayjs(selectedSchedule.end_ts).tz(SEOUL_TZ).subtract(1, "day");
                            if (endInclusive.isBefore(start, "day") || endInclusive.isSame(start, "day")) {
                              return `${start.format("YYYY-MM-DD")} (종일)`;
                            }
                            return `${start.format("YYYY-MM-DD")} ~ ${endInclusive.format("YYYY-MM-DD")} (종일)`;
                          })()
                        : `${dayjs(selectedSchedule.start_ts).tz(SEOUL_TZ).format("YYYY-MM-DD HH:mm")} ~ ${dayjs(
                            selectedSchedule.end_ts
                          )
                            .tz(SEOUL_TZ)
                            .format("YYYY-MM-DD HH:mm")}`}
                    </p>
                  </div>

                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[11px] text-cyan-100/60">라벨</p>
                    <p className="flex items-center gap-2 text-cyan-50">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: normalizeHexColor(selectedSchedule.schedule_label_color) || "#0EA5E9"
                        }}
                      />
                      <span>{selectedSchedule.schedule_label_name}</span>
                    </p>
                  </div>

                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[11px] text-cyan-100/60">반복/패턴 요약</p>
                    <p className="text-cyan-50">{extractRepeatSummary(selectedSchedule, patterns)}</p>
                  </div>

                  {selectedSchedule.group_id ? (
                    <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-cyan-100/60">반복 일정 목록</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={requestDeleteScheduleGroup}
                            className="inline-flex items-center gap-1 rounded border border-rose-300/45 px-2 py-0.5 text-[11px] text-rose-200"
                            aria-label="반복 일정 전체 삭제"
                            title="반복 일정 전체 삭제">
                            <TrashIcon className="h-3.5 w-3.5" />
                            전체
                          </button>
                          {repeatGroupItems.length > 4 ? (
                            <button
                              type="button"
                              onClick={() => setRepeatGroupExpanded((prev) => !prev)}
                              className="inline-flex items-center gap-1 rounded border border-cyan-300/35 px-2 py-0.5 text-[11px] text-cyan-100"
                              aria-label={repeatGroupExpanded ? "반복 일정 목록 접기" : "반복 일정 목록 더보기"}
                              title={repeatGroupExpanded ? "접기" : "더보기"}>
                              {repeatGroupExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                              {!repeatGroupExpanded ? <span>+{hiddenRepeatGroupCount}</span> : null}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {repeatGroupLoading ? (
                        <p className="text-[11px] text-cyan-100/70">반복 일정 목록 로딩 중...</p>
                      ) : repeatGroupItems.length === 0 ? (
                        <p className="text-[11px] text-cyan-100/70">반복 일정이 없습니다.</p>
                      ) : (
                        <div className="max-h-[30dvh] space-y-1 overflow-y-auto pr-1">
                          {visibleRepeatGroupItems.map((groupItem) => {
                            const active = groupItem.id === selectedSchedule.id;
                            const timeText = groupItem.all_day
                              ? `${dayjs(groupItem.start_ts).tz(SEOUL_TZ).format("YYYY-MM-DD")} (종일)`
                              : dayjs(groupItem.start_ts).tz(SEOUL_TZ).format("YYYY-MM-DD HH:mm");
                            return (
                              <button
                                key={groupItem.id}
                                type="button"
                                onClick={() => openScheduleDetailItem(groupItem, { collapseRepeatList: false })}
                                className={`w-full rounded-lg border px-2 py-1.5 text-left ${
                                  active ? "border-teal-300/55 bg-teal-900/25" : "border-cyan-100/10 bg-black/15"
                                }`}>
                                <p className="truncate text-xs text-cyan-50">
                                  {groupItem.title?.trim() || groupItem.schedule_type_name}
                                </p>
                                <p className="text-[11px] text-cyan-100/70">{timeText}</p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-cyan-100/15 bg-cyan-950/20 px-3 py-2">
                    <p className="text-[11px] text-cyan-100/60">메모</p>
                    <MarkdownViewer value={extractMemoText(selectedSchedule.memo)} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {confirmDialog.open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={() => closeConfirmDialog(true)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-cyan-200/30 bg-[#031718] p-4"
            onClick={(event) => event.stopPropagation()}>
            <h3 className="text-sm font-semibold text-cyan-50">{confirmDialog.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-cyan-100/85">{confirmDialog.message}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeConfirmDialog(true)}
                className="rounded-lg border border-cyan-300/35 px-3 py-2 text-sm text-cyan-100"
                disabled={confirmDialogBusy}>
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDialogSubmit()}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  confirmDialog.tone === "danger" ? "bg-rose-300 text-rose-950" : "bg-cyan-300 text-cyan-950"
                } disabled:opacity-60`}
                disabled={confirmDialogBusy}>
                {confirmDialogBusy ? "처리 중..." : confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-xs text-cyan-100/70">로딩 중...</p> : null}
    </div>
  );
}
