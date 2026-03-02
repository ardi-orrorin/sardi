export type ShiftType = {
  id: string;
  name: string;
  start_offset: string;
  duration: string;
  all_day: boolean;
};

export type Pattern = {
  id: string;
  name: string;
  cycle_days: number;
};

export type ScheduleLabel = {
  id: string;
  name: string;
  color: string;
  create_at: string;
};

export type ScheduleItem = {
  id: string;
  schedule_label_id: string;
  schedule_label_name: string;
  schedule_label_color: string;
  schedule_type_id?: string | null;
  schedule_type_name?: string | null;
  title?: string;
  memo?: unknown;
  start_ts: string;
  end_ts: string;
  all_day: boolean;
  group_id?: string;
};

export type ScheduleDetailForm = {
  title: string;
  schedule_label_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  memo: string;
};

export type RepeatUnitValue = "week" | "month" | "year";

export type ScheduleListResponse = {
  items: ScheduleItem[];
};

export type PublicHolidayItem = {
  date_kind: string;
  date_name: string;
  is_holiday: boolean;
  locdate: string;
  seq?: number;
};

export type PublicHolidayListResponse = {
  year: number;
  month: number;
  total_count: number;
  items: PublicHolidayItem[];
};

export type ScheduleGroupDetailResponse = {
  group_id: string;
  items: ScheduleItem[];
};

export type ConfirmDialogState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  tone: "warning" | "danger";
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    labelId: string;
  };
};
