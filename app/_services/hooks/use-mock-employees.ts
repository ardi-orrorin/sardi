"use client";

import {
  MockEmployee,
  loadMockEmployees,
  subscribeMockEmployees
} from "@/app/_services/utils/mock-employees";
import { useSyncExternalStore } from "react";

const EMPTY_EMPLOYEES_SNAPSHOT: MockEmployee[] = [];

export function useMockEmployees(): MockEmployee[] {
  return useSyncExternalStore(
    subscribeMockEmployees,
    loadMockEmployees,
    () => EMPTY_EMPLOYEES_SNAPSHOT
  );
}
