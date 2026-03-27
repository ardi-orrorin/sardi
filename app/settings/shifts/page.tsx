import { redirect } from "next/navigation";

export default function LegacyShiftSettingsPage() {
  redirect("/schedule/work-schedule/shift-types");
}
