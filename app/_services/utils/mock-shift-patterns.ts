"use client";

import { requestApiJson } from "@/app/_services/utils/api-client";
import { createRemoteCollectionStore } from "@/app/_services/utils/remote-store";
import { MockShiftType } from "@/app/_services/utils/mock-shift-types";

type ShiftPatternApiResponse = {
  id: string;
  name: string;
  description: string;
  sequence: string[];
};

export type MockShiftPattern = {
  id: string;
  name: string;
  description: string;
  sequence: string[];
};

export type SaveShiftPatternInput = Omit<MockShiftPattern, "id">;

function cloneShiftPattern(item: MockShiftPattern): MockShiftPattern {
  return {
    ...item,
    sequence: [...item.sequence]
  };
}

function mapShiftPatternResponse(item: ShiftPatternApiResponse): MockShiftPattern {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    sequence: [...item.sequence]
  };
}

function buildPatternSteps(sequence: string[], shiftTypes: MockShiftType[]) {
  const shiftTypeIdByCode = new Map(
    shiftTypes.map((item) => [
      item.code,
      item.id
    ])
  );

  return sequence.map((code) => {
    const shiftTypeId = shiftTypeIdByCode.get(code);
    if (!shiftTypeId) {
      throw new Error(`등록되지 않은 근무 코드입니다: ${code}`);
    }

    return {
      shift_type_id: shiftTypeId
    };
  });
}

async function fetchShiftPatterns() {
  const items = await requestApiJson<ShiftPatternApiResponse[]>("/api/sardi/patterns");
  return items.map(mapShiftPatternResponse);
}

const shiftPatternStore = createRemoteCollectionStore(fetchShiftPatterns, cloneShiftPattern);

export function loadMockShiftPatterns() {
  return shiftPatternStore.getSnapshot();
}

export function subscribeMockShiftPatterns(onStoreChange: () => void) {
  return shiftPatternStore.subscribe(onStoreChange);
}

export async function refreshMockShiftPatterns(force = true) {
  return shiftPatternStore.refresh(force);
}

export async function createMockShiftPattern(
  input: SaveShiftPatternInput,
  shiftTypes: MockShiftType[]
) {
  await requestApiJson<ShiftPatternApiResponse>("/api/sardi/patterns", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      steps: buildPatternSteps(input.sequence, shiftTypes)
    })
  });

  await shiftPatternStore.refresh(true);
}

export async function updateMockShiftPattern(
  id: string,
  input: SaveShiftPatternInput,
  shiftTypes: MockShiftType[]
) {
  await requestApiJson<ShiftPatternApiResponse>(`/api/sardi/patterns/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      steps: buildPatternSteps(input.sequence, shiftTypes)
    })
  });

  await shiftPatternStore.refresh(true);
}

export async function deleteMockShiftPattern(id: string) {
  await requestApiJson<{ deleted: boolean }>(`/api/sardi/patterns/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  await shiftPatternStore.refresh(true);
}
