"use client";

import {
  MockCompanyEvent,
  loadMockCompanyEvents,
  subscribeMockCompanyEvents
} from "@/app/_services/utils/mock-company-events";
import { useSyncExternalStore } from "react";

const EMPTY_COMPANY_EVENTS_SNAPSHOT: MockCompanyEvent[] = [];

export function useMockCompanyEvents(): MockCompanyEvent[] {
  return useSyncExternalStore(
    subscribeMockCompanyEvents,
    loadMockCompanyEvents,
    () => EMPTY_COMPANY_EVENTS_SNAPSHOT
  );
}
