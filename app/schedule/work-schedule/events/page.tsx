import { MockCompanyEventManager } from "@/app/_services/components/mock-company-event-manager";
import { SchedulePageShell } from "@/app/_services/components/schedule-page-shell";

export default function WorkScheduleEventsPage() {
  return (
    <SchedulePageShell current="company-events" title="회사 이벤트">
      <MockCompanyEventManager />
    </SchedulePageShell>
  );
}
