"use client";

import { requestApiJson } from "@/app/_services/utils/api-client";
import { createRemoteCollectionStore } from "@/app/_services/utils/remote-store";
import { MockShiftType } from "@/app/_services/utils/mock-shift-types";

type EmployeePatternAssignmentApiResponse = {
  id: string;
  pattern_id: string | null;
  effective_from: string;
  effective_to: string | null;
  pattern_anchor_date: string;
  pattern_offset: number;
  note: string;
};

type EmployeeOverrideApiResponse = {
  id: string;
  date: string;
  shift_type_id: string;
  shift_code: string;
  reason: string;
  note: string;
};

type EmployeeApiResponse = {
  id: string;
  name: string;
  employee_no: string | null;
  team: string;
  role: string;
  color: string;
  weekly_hours: number;
  display_order: number;
  pattern_assignments: EmployeePatternAssignmentApiResponse[];
  overrides: EmployeeOverrideApiResponse[];
};

export type MockEmployeePatternAssignment = {
  id: string;
  pattern_id: string | null;
  effective_from: string;
  effective_to: string | null;
  pattern_anchor_date: string;
  pattern_offset: number;
};

export type MockEmployeeOverride = {
  id: string;
  date: string;
  shift_code: string;
  reason: string;
};

export type MockEmployee = {
  id: string;
  name: string;
  team: string;
  role: string;
  color: string;
  weekly_hours: number;
  display_order: number;
  pattern_assignments: MockEmployeePatternAssignment[];
  overrides: MockEmployeeOverride[];
};

export type SaveEmployeeInput = Omit<MockEmployee, "id" | "display_order"> & {
  display_order?: number;
};

function compareNullableDate(left: string | null, right: string | null) {
  return (left ?? "9999-12-31").localeCompare(right ?? "9999-12-31");
}

function clonePatternAssignment(item: MockEmployeePatternAssignment): MockEmployeePatternAssignment {
  return { ...item };
}

function cloneOverride(item: MockEmployeeOverride): MockEmployeeOverride {
  return { ...item };
}

function cloneEmployee(item: MockEmployee): MockEmployee {
  return {
    ...item,
    pattern_assignments: [...item.pattern_assignments]
      .sort(
        (left, right) =>
          left.effective_from.localeCompare(right.effective_from) ||
          compareNullableDate(left.effective_to, right.effective_to) ||
          left.id.localeCompare(right.id)
      )
      .map(clonePatternAssignment),
    overrides: [...item.overrides]
      .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id))
      .map(cloneOverride)
  };
}

function mapPatternAssignmentResponse(
  item: EmployeePatternAssignmentApiResponse
): MockEmployeePatternAssignment {
  return {
    id: item.id,
    pattern_id: item.pattern_id,
    effective_from: item.effective_from,
    effective_to: item.effective_to,
    pattern_anchor_date: item.pattern_anchor_date,
    pattern_offset: item.pattern_offset
  };
}

function mapOverrideResponse(item: EmployeeOverrideApiResponse): MockEmployeeOverride {
  return {
    id: item.id,
    date: item.date,
    shift_code: item.shift_code,
    reason: item.reason
  };
}

function mapEmployeeResponse(item: EmployeeApiResponse): MockEmployee {
  return {
    id: item.id,
    name: item.name,
    team: item.team,
    role: item.role,
    color: item.color,
    weekly_hours: item.weekly_hours,
    display_order: item.display_order,
    pattern_assignments: item.pattern_assignments.map(mapPatternAssignmentResponse),
    overrides: item.overrides.map(mapOverrideResponse)
  };
}

function areAssignmentsEqual(
  left: MockEmployeePatternAssignment,
  right: MockEmployeePatternAssignment
) {
  return (
    left.pattern_id === right.pattern_id &&
    left.effective_from === right.effective_from &&
    left.effective_to === right.effective_to &&
    left.pattern_anchor_date === right.pattern_anchor_date &&
    left.pattern_offset === right.pattern_offset
  );
}

function areOverridesEqual(left: MockEmployeeOverride, right: MockEmployeeOverride) {
  return (
    left.date === right.date &&
    left.shift_code === right.shift_code &&
    left.reason.trim() === right.reason.trim()
  );
}

function findShiftTypeIdByCode(shiftTypes: MockShiftType[], shiftCode: string) {
  const shiftType = shiftTypes.find((item) => item.code === shiftCode);
  if (!shiftType) {
    throw new Error(`등록되지 않은 근무 형태입니다: ${shiftCode}`);
  }

  return shiftType.id;
}

async function fetchEmployees() {
  const items = await requestApiJson<EmployeeApiResponse[]>("/api/sardi/employees");
  return items
    .map(mapEmployeeResponse)
    .sort(
      (left, right) =>
        left.display_order - right.display_order || left.name.localeCompare(right.name)
    );
}

const employeeStore = createRemoteCollectionStore(fetchEmployees, cloneEmployee);

export function loadMockEmployees() {
  return employeeStore.getSnapshot();
}

export function subscribeMockEmployees(onStoreChange: () => void) {
  return employeeStore.subscribe(onStoreChange);
}

export async function refreshMockEmployees(force = true) {
  return employeeStore.refresh(force);
}

async function syncPatternAssignments(
  employeeId: string,
  currentAssignments: MockEmployeePatternAssignment[],
  nextAssignments: MockEmployeePatternAssignment[]
) {
  const currentById = new Map(currentAssignments.map((item) => [item.id, item]));
  const nextById = new Map(nextAssignments.map((item) => [item.id, item]));

  await Promise.all(
    currentAssignments
      .filter((item) => !nextById.has(item.id))
      .map((item) =>
        requestApiJson<{ deleted: boolean }>(
          `/api/sardi/employees/${encodeURIComponent(employeeId)}/pattern-assignments/${encodeURIComponent(item.id)}`,
          { method: "DELETE" }
        )
      )
  );

  for (const item of nextAssignments) {
    const body = {
      pattern_id: item.pattern_id,
      effective_from: item.effective_from,
      effective_to: item.effective_to,
      pattern_anchor_date: item.pattern_anchor_date,
      pattern_offset: item.pattern_offset
    };

    const current = currentById.get(item.id);
    if (!current) {
      await requestApiJson(
        `/api/sardi/employees/${encodeURIComponent(employeeId)}/pattern-assignments`,
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
      continue;
    }

    if (!areAssignmentsEqual(current, item)) {
      await requestApiJson(
        `/api/sardi/employees/${encodeURIComponent(employeeId)}/pattern-assignments/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body)
        }
      );
    }
  }
}

async function syncOverrides(
  employeeId: string,
  currentOverrides: MockEmployeeOverride[],
  nextOverrides: MockEmployeeOverride[],
  shiftTypes: MockShiftType[]
) {
  const currentById = new Map(currentOverrides.map((item) => [item.id, item]));
  const nextById = new Map(nextOverrides.map((item) => [item.id, item]));

  await Promise.all(
    currentOverrides
      .filter((item) => !nextById.has(item.id))
      .map((item) =>
        requestApiJson<{ deleted: boolean }>(
          `/api/sardi/employees/${encodeURIComponent(employeeId)}/schedule-overrides/${encodeURIComponent(item.id)}`,
          { method: "DELETE" }
        )
      )
  );

  for (const item of nextOverrides) {
    const body = {
      date: item.date,
      shift_type_id: findShiftTypeIdByCode(shiftTypes, item.shift_code),
      reason: item.reason.trim()
    };

    const current = currentById.get(item.id);
    if (!current) {
      await requestApiJson(
        `/api/sardi/employees/${encodeURIComponent(employeeId)}/schedule-overrides`,
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );
      continue;
    }

    if (!areOverridesEqual(current, item)) {
      await requestApiJson(
        `/api/sardi/employees/${encodeURIComponent(employeeId)}/schedule-overrides/${encodeURIComponent(item.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(body)
        }
      );
    }
  }
}

export async function createMockEmployee(
  input: SaveEmployeeInput,
  shiftTypes: MockShiftType[],
  currentEmployees: MockEmployee[]
) {
  const createdEmployee = await requestApiJson<EmployeeApiResponse>("/api/sardi/employees", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      team: input.team,
      role: input.role,
      color: input.color,
      weekly_hours: input.weekly_hours,
      display_order: input.display_order ?? currentEmployees.length
    })
  });

  const employeeId = createdEmployee.id;
  await syncPatternAssignments(employeeId, [], input.pattern_assignments);
  await syncOverrides(employeeId, [], input.overrides, shiftTypes);
  await employeeStore.refresh(true);
}

export async function updateMockEmployee(
  id: string,
  input: SaveEmployeeInput,
  shiftTypes: MockShiftType[],
  currentEmployee: MockEmployee
) {
  await requestApiJson<EmployeeApiResponse>(`/api/sardi/employees/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      team: input.team,
      role: input.role,
      color: input.color,
      weekly_hours: input.weekly_hours
    })
  });

  await syncPatternAssignments(id, currentEmployee.pattern_assignments, input.pattern_assignments);
  await syncOverrides(id, currentEmployee.overrides, input.overrides, shiftTypes);
  await employeeStore.refresh(true);
}

export async function deleteMockEmployee(id: string) {
  await requestApiJson<{ deleted: boolean }>(`/api/sardi/employees/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  await employeeStore.refresh(true);
}

export async function reorderMockEmployees(items: MockEmployee[]) {
  await Promise.all(
    items.map((item, index) =>
      requestApiJson<EmployeeApiResponse>(`/api/sardi/employees/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_order: index
        })
      })
    )
  );

  await employeeStore.refresh(true);
}

export async function upsertMockEmployeeOverride(params: {
  employeeId: string;
  overrideId?: string | null;
  date: string;
  shiftCode: string;
  reason: string;
  shiftTypes: MockShiftType[];
}) {
  const body = {
    date: params.date,
    shift_type_id: findShiftTypeIdByCode(params.shiftTypes, params.shiftCode),
    reason: params.reason.trim()
  };

  if (params.overrideId) {
    await requestApiJson(
      `/api/sardi/employees/${encodeURIComponent(params.employeeId)}/schedule-overrides/${encodeURIComponent(params.overrideId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body)
      }
    );
  } else {
    await requestApiJson(
      `/api/sardi/employees/${encodeURIComponent(params.employeeId)}/schedule-overrides`,
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );
  }

  await employeeStore.refresh(true);
}

export async function deleteMockEmployeeOverride(employeeId: string, overrideId: string) {
  await requestApiJson<{ deleted: boolean }>(
    `/api/sardi/employees/${encodeURIComponent(employeeId)}/schedule-overrides/${encodeURIComponent(overrideId)}`,
    {
      method: "DELETE"
    }
  );

  await employeeStore.refresh(true);
}
