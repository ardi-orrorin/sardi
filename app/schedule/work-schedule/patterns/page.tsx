import { MockShiftPatternManager } from "@/app/_services/components/mock-shift-pattern-manager";
import { SchedulePageShell } from "@/app/_services/components/schedule-page-shell";

export default function WorkSchedulePatternsPage() {
  return (
    <SchedulePageShell current="shift-patterns" title="반복 패턴">
      <MockShiftPatternManager />
    </SchedulePageShell>
  );
}
