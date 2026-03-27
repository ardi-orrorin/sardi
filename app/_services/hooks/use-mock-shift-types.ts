"use client";

import {
  MockShiftType,
  loadMockShiftTypes,
  subscribeMockShiftTypes
} from "@/app/_services/utils/mock-shift-types";
import { useSyncExternalStore } from "react";

const EMPTY_SHIFT_TYPES_SNAPSHOT: MockShiftType[] = [];

export function useMockShiftTypes(): MockShiftType[] {
  return useSyncExternalStore(
    subscribeMockShiftTypes,
    loadMockShiftTypes,
    () => EMPTY_SHIFT_TYPES_SNAPSHOT
  );
}
