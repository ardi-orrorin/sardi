import { MockEmployeeManager } from "@/app/_services/components/mock-employee-manager";
import { SchedulePageShell } from "@/app/_services/components/schedule-page-shell";

export default function WorkScheduleEmployeesPage() {
  return (
    <SchedulePageShell current="employees" title="직원">
      <MockEmployeeManager />
    </SchedulePageShell>
  );
}
