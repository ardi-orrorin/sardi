import { MockShiftTypeManager } from "@/app/_services/components/mock-shift-type-manager";
import { SchedulePageShell } from "@/app/_services/components/schedule-page-shell";

export default function WorkScheduleShiftTypesPage() {
  return (
    <SchedulePageShell current="shift-types" title="근무 형태">
      <MockShiftTypeManager />
    </SchedulePageShell>
  );
}
