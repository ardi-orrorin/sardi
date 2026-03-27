"use client";

import {
  MockShiftPattern,
  loadMockShiftPatterns,
  subscribeMockShiftPatterns
} from "@/app/_services/utils/mock-shift-patterns";
import { useSyncExternalStore } from "react";

const EMPTY_SHIFT_PATTERNS_SNAPSHOT: MockShiftPattern[] = [];

export function useMockShiftPatterns(): MockShiftPattern[] {
  return useSyncExternalStore(
    subscribeMockShiftPatterns,
    loadMockShiftPatterns,
    () => EMPTY_SHIFT_PATTERNS_SNAPSHOT
  );
}
