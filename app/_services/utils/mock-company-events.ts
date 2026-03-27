"use client";

import { requestApiJson } from "@/app/_services/utils/api-client";
import { createRemoteCollectionStore } from "@/app/_services/utils/remote-store";

type CompanyEventApiResponse = {
  id: string;
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

export type MockCompanyEvent = {
  id: string;
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

export type MockCompanyEventOccurrence = MockCompanyEvent & {
  occurrence_id: string;
  source_event_id: string;
  occurrence_index: number;
  occurrence_start_date: string;
  occurrence_end_date: string;
};

export type SaveCompanyEventInput = Omit<MockCompanyEvent, "id">;

function cloneCompanyEvent(item: MockCompanyEvent): MockCompanyEvent {
  return { ...item };
}

function mapCompanyEventResponse(item: CompanyEventApiResponse): MockCompanyEvent {
  return {
    id: item.id,
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

async function fetchCompanyEvents() {
  const items = await requestApiJson<CompanyEventApiResponse[]>("/api/sardi/company-events");
  return items.map(mapCompanyEventResponse);
}

const companyEventStore = createRemoteCollectionStore(fetchCompanyEvents, cloneCompanyEvent);

export function loadMockCompanyEvents() {
  return companyEventStore.getSnapshot();
}

export function subscribeMockCompanyEvents(onStoreChange: () => void) {
  return companyEventStore.subscribe(onStoreChange);
}

export async function refreshMockCompanyEvents(force = true) {
  return companyEventStore.refresh(force);
}

export async function createMockCompanyEvent(input: SaveCompanyEventInput) {
  await requestApiJson<CompanyEventApiResponse>("/api/sardi/company-events", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      category: input.category,
      start_date: input.start_date,
      end_date: input.end_date,
      repeat_interval_days: input.repeat_interval_days,
      repeat_count: input.repeat_count,
      color: input.color,
      note: input.note,
      all_day: input.all_day
    })
  });

  await companyEventStore.refresh(true);
}

export async function updateMockCompanyEvent(id: string, input: SaveCompanyEventInput) {
  await requestApiJson<CompanyEventApiResponse>(`/api/sardi/company-events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      category: input.category,
      start_date: input.start_date,
      end_date: input.end_date,
      repeat_interval_days: input.repeat_interval_days,
      repeat_count: input.repeat_count,
      color: input.color,
      note: input.note,
      all_day: input.all_day
    })
  });

  await companyEventStore.refresh(true);
}

export async function deleteMockCompanyEvent(id: string) {
  await requestApiJson<{ deleted: boolean }>(`/api/sardi/company-events/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  await companyEventStore.refresh(true);
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const next = parseDate(value);
  next.setDate(next.getDate() + days);
  return formatDate(next);
}

export function expandMockCompanyEventOccurrences(
  items: MockCompanyEvent[],
  rangeStart?: string,
  rangeEnd?: string
): MockCompanyEventOccurrence[] {
  return items
    .flatMap((item) => {
      const repeatCount = Math.max(1, item.repeat_count);
      const repeatIntervalDays = Math.max(1, item.repeat_interval_days);

      return Array.from({ length: repeatCount }, (_, occurrenceIndex) => {
        const dayOffset = occurrenceIndex * repeatIntervalDays;
        const occurrenceStartDate = addDays(item.start_date, dayOffset);
        const occurrenceEndDate = addDays(item.end_date, dayOffset);

        return {
          ...item,
          occurrence_id: `${item.id}-${occurrenceIndex}`,
          source_event_id: item.id,
          occurrence_index: occurrenceIndex,
          occurrence_start_date: occurrenceStartDate,
          occurrence_end_date: occurrenceEndDate
        };
      });
    })
    .filter((item) => {
      if (!rangeStart || !rangeEnd) {
        return true;
      }

      return !(item.occurrence_end_date < rangeStart || item.occurrence_start_date > rangeEnd);
    })
    .sort((left, right) => left.occurrence_start_date.localeCompare(right.occurrence_start_date));
}
