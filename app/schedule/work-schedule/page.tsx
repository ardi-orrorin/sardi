import { SchedulePageShell } from "@/app/_services/components/schedule-page-shell";
import StaffScheduleBoard from "@/app/_services/components/staff-schedule-board";

export default function WorkSchedulePage() {
  return (
    <SchedulePageShell current="work-schedule" title="근무 스케줄">
      <StaffScheduleBoard />
    </SchedulePageShell>
  );
}
