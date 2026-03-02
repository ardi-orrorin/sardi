import { dayjs, type Dayjs } from "@/app/_commons/utils/dayjs";
import type { Pattern, RepeatUnitValue, ScheduleDetailForm, ScheduleItem } from "@/app/_services/scheduler/types";

export const SEOUL_TZ = "Asia/Seoul";
export const SEOUL_OFFSET = "+09:00";
export const DEFAULT_LABEL_COLOR = "#0EA5E9";

export const seedColor = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 74% 46%)`;
};

export const toDateInput = (value: Dayjs) => value.tz(SEOUL_TZ).format("YYYY-MM-DD");
export const toIsoWithOffset = (date: string, time: string) => `${date}T${time}:00${SEOUL_OFFSET}`;
export const toSeoulDate = (value: string) => dayjs(value).tz(SEOUL_TZ).format("YYYY-MM-DD");
export const toSeoulDateTime = (value: string) => dayjs(value).tz(SEOUL_TZ).format("YYYY-MM-DDTHH:mm:ssZ");

export const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const valid = /^#[0-9A-Fa-f]{6}$/.test(prefixed);
  return valid ? prefixed.toUpperCase() : "";
};

const extractMemoTextFromObject = (memoObj: Record<string, unknown>) => {
  const markdown = memoObj.markdown;
  if (typeof markdown === "string") {
    return markdown.trim();
  }

  const note = memoObj.note;
  if (typeof note === "string") {
    return note.trim();
  }

  const content = memoObj.content;
  if (typeof content === "string") {
    return content.trim();
  }

  const text = memoObj.text;
  if (typeof text === "string") {
    return text.trim();
  }

  return "";
};

export const extractMemoText = (memo: unknown) => {
  if (!memo) {
    return "";
  }

  if (typeof memo === "string") {
    const trimmed = memo.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return extractMemoTextFromObject(parsed as Record<string, unknown>);
        }
      } catch {
        return trimmed;
      }
    }

    return trimmed;
  }

  if (typeof memo === "object") {
    if (Array.isArray(memo)) {
      return "";
    }
    return extractMemoTextFromObject(memo as Record<string, unknown>);
  }

  return "";
};

export const toScheduleDetailForm = (item: ScheduleItem): ScheduleDetailForm => {
  const start = dayjs(item.start_ts).tz(SEOUL_TZ);
  const rawEnd = dayjs(item.end_ts).tz(SEOUL_TZ);
  const end = item.all_day ? rawEnd.subtract(1, "day") : rawEnd;
  const safeEnd = end.isBefore(start) ? start : end;

  return {
    title: item.title?.trim() || item.schedule_type_name,
    schedule_label_id: item.schedule_label_id,
    start_date: start.format("YYYY-MM-DD"),
    end_date: safeEnd.format("YYYY-MM-DD"),
    start_time: start.format("HH:mm"),
    end_time: safeEnd.format("HH:mm"),
    all_day: item.all_day,
    memo: extractMemoText(item.memo)
  };
};

export const addByRepeatUnit = (value: Dayjs, repeatUnit: RepeatUnitValue, amount: number) =>
  repeatUnit === "week"
    ? value.add(amount, "week")
    : repeatUnit === "month"
      ? value.add(amount, "month")
      : value.add(amount, "year");

const repeatUnitToKorean = (repeatUnit: string) => {
  if (repeatUnit === "week") {
    return "주";
  }
  if (repeatUnit === "month") {
    return "월";
  }
  if (repeatUnit === "year") {
    return "년";
  }
  if (repeatUnit === "cycle") {
    return "패턴 주기";
  }
  return "반복";
};

export const extractRepeatSummary = (item: ScheduleItem, patterns: Pattern[]) => {
  const memo = item.memo;
  if (!memo || typeof memo !== "object" || Array.isArray(memo)) {
    return item.group_id ? "반복 그룹 일정" : "단일 일정";
  }

  const source = (memo as Record<string, unknown>).source;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return item.group_id ? "반복 그룹 일정" : "단일 일정";
  }

  const sourceMap = source as Record<string, unknown>;
  const sourceType = typeof sourceMap.type === "string" ? sourceMap.type : "";

  if (sourceType === "pattern_generate") {
    const patternId = typeof sourceMap.pattern_id === "string" ? sourceMap.pattern_id : "";
    const repeatUnit = sourceMap.repeat_unit;
    const repeatCount = sourceMap.repeat_count;
    const fallbackName = typeof sourceMap.pattern_name === "string" ? sourceMap.pattern_name : "";
    const patternName = patterns.find((value) => value.id === patternId)?.name || fallbackName || "패턴";
    const unitText = typeof repeatUnit === "string" ? `${repeatUnitToKorean(repeatUnit)} 단위` : "반복";
    const countText = typeof repeatCount === "number" ? `${repeatCount}회` : "횟수 미상";
    return `패턴 반복: ${patternName} · ${unitText} · ${countText}`;
  }

  if (sourceType === "manual_repeat") {
    const repeatUnit = sourceMap.repeat_unit;
    const repeatCount = sourceMap.repeat_count;
    const repeatIndex = sourceMap.repeat_index;
    const unitText = typeof repeatUnit === "string" ? `${repeatUnitToKorean(repeatUnit)} 단위` : "반복";
    const countText = typeof repeatCount === "number" ? `${repeatCount}회` : "횟수 미상";
    const indexText = typeof repeatIndex === "number" ? ` (${repeatIndex}/${repeatCount})` : "";
    return `일반 반복 일정: ${unitText} · ${countText}${indexText}`;
  }

  return item.group_id ? "반복 그룹 일정" : "단일 일정";
};

export const hasScheduleRangeChanged = (
  item: ScheduleItem,
  nextStartTs: string,
  nextEndTs: string,
  nextAllDay: boolean
) => {
  const startChanged = dayjs(item.start_ts).valueOf() !== dayjs(nextStartTs).valueOf();
  const endChanged = dayjs(item.end_ts).valueOf() !== dayjs(nextEndTs).valueOf();
  const allDayChanged = item.all_day !== nextAllDay;
  return startChanged || endChanged || allDayChanged;
};

export const toSeoulDateKeyFromDate = (date: Date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((item) => item.type === "year")?.value ?? "0000";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

export const collectYearMonthTargets = (startIso: string, endIso: string) => {
  const startMonth = dayjs(startIso).tz(SEOUL_TZ).startOf("month");
  const endMonth = dayjs(endIso).tz(SEOUL_TZ).subtract(1, "day").startOf("month");

  if (!startMonth.isValid() || !endMonth.isValid()) {
    return [] as Array<{ year: number; month: number }>;
  }

  const targets: Array<{ year: number; month: number }> = [];
  let cursor = startMonth;
  let guard = 0;

  while ((cursor.isBefore(endMonth) || cursor.isSame(endMonth, "month")) && guard < 120) {
    targets.push({
      year: cursor.year(),
      month: cursor.month() + 1
    });
    cursor = cursor.add(1, "month");
    guard += 1;
  }

  return targets;
};

export const buildUserHolidayDateSet = (items: ScheduleItem[]) => {
  const dates = new Set<string>();

  for (const item of items) {
    const title = (item.title?.trim() || item.schedule_type_name || "").trim();
    if (!title.includes("휴일")) {
      continue;
    }

    const start = dayjs(item.start_ts).tz(SEOUL_TZ);
    let end = dayjs(item.end_ts).tz(SEOUL_TZ);
    end = item.all_day ? end.subtract(1, "day") : end.subtract(1, "second");

    if (!end.isValid() || end.isBefore(start)) {
      end = start;
    }

    let cursor = start.startOf("day");
    const last = end.startOf("day");

    while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
      dates.add(cursor.format("YYYY-MM-DD"));
      cursor = cursor.add(1, "day");
    }
  }

  return dates;
};
