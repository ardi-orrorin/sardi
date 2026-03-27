"use client";

import { TopNavbar, type NavbarPage } from "@/app/_services/components/top-navbar";
import { useAuthActions } from "@/app/_services/hooks/use-auth-actions";
import { ReactNode } from "react";

type SchedulePageShellProps = {
  current: NavbarPage;
  title: string;
  children: ReactNode;
};

export function SchedulePageShell({ current, title, children }: SchedulePageShellProps) {
  const { logout } = useAuthActions();

  return (
    <div className="schedule-shell space-y-4">
      <TopNavbar current={current} title={title} onLogout={() => void logout()} />
      {children}
    </div>
  );
}
