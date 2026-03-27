"use client";

import { requestApiJson } from "@/app/_services/utils/api-client";
import { createRemoteCollectionStore } from "@/app/_services/utils/remote-store";

type ShiftTypeApiResponse = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  start: string;
  end: string;
  color: string;
  text_color: string;
  all_day: boolean;
  is_active: boolean;
  sort_order: number;
};

export type MockShiftType = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  start: string;
  end: string;
  color: string;
  text_color: string;
  all_day: boolean;
};

export type SaveShiftTypeInput = Omit<MockShiftType, "id">;

function cloneShiftType(item: MockShiftType): MockShiftType {
  return { ...item };
}

function normalizeTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const [hour = "", minute = ""] = trimmed.split(":");
  if (!hour || !minute) {
    return trimmed;
  }

  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function mapShiftTypeResponse(item: ShiftTypeApiResponse): MockShiftType {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    description: item.description,
    start: normalizeTimeValue(item.start),
    end: normalizeTimeValue(item.end),
    color: item.color,
    text_color: item.text_color,
    all_day: item.all_day
  };
}

async function fetchShiftTypes() {
  const items = await requestApiJson<ShiftTypeApiResponse[]>("/api/sardi/shift-types");
  return items.map(mapShiftTypeResponse);
}

const shiftTypeStore = createRemoteCollectionStore(fetchShiftTypes, cloneShiftType);

export function loadMockShiftTypes() {
  return shiftTypeStore.getSnapshot();
}

export function subscribeMockShiftTypes(onStoreChange: () => void) {
  return shiftTypeStore.subscribe(onStoreChange);
}

export async function refreshMockShiftTypes(force = true) {
  return shiftTypeStore.refresh(force);
}

export async function createMockShiftType(input: SaveShiftTypeInput, sortOrder?: number) {
  await requestApiJson<ShiftTypeApiResponse>("/api/sardi/shift-types", {
    method: "POST",
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      start: input.all_day ? "" : input.start,
      end: input.all_day ? "" : input.end,
      all_day: input.all_day,
      color: input.color,
      text_color: input.text_color,
      is_active: true,
      sort_order: sortOrder
    })
  });

  await shiftTypeStore.refresh(true);
}

export async function updateMockShiftType(id: string, input: SaveShiftTypeInput) {
  await requestApiJson<ShiftTypeApiResponse>(`/api/sardi/shift-types/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      code: input.code,
      name: input.name,
      category: input.category,
      description: input.description,
      start: input.all_day ? "" : input.start,
      end: input.all_day ? "" : input.end,
      all_day: input.all_day,
      color: input.color,
      text_color: input.text_color
    })
  });

  await shiftTypeStore.refresh(true);
}

export async function deleteMockShiftType(id: string) {
  await requestApiJson<{ deleted: boolean }>(`/api/sardi/shift-types/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  await shiftTypeStore.refresh(true);
}
