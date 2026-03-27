"use client";

import { LogoutIcon } from "@/app/_services/components/icons";
import Link from "next/link";

export type NavbarPage =
  | "dashboard"
  | "work-schedule"
  | "shift-types"
  | "shift-patterns"
  | "employees"
  | "company-events"
  | "account";

type TopNavbarProps = {
  current: NavbarPage;
  title: string;
  onLogout: () => void | Promise<void>;
};

const NAV_ITEMS: Array<{ key: Exclude<NavbarPage, "dashboard">; href: string; label: string }> = [
  { key: "work-schedule", href: "/schedule/work-schedule", label: "근무 스케줄" },
  { key: "shift-types", href: "/schedule/work-schedule/shift-types", label: "근무 형태" },
  { key: "shift-patterns", href: "/schedule/work-schedule/patterns", label: "반복 패턴" },
  { key: "employees", href: "/schedule/work-schedule/employees", label: "직원" },
  { key: "company-events", href: "/schedule/work-schedule/events", label: "회사 이벤트" },
  { key: "account", href: "/settings/account", label: "계정 설정" }
];

const PAGE_LABEL_MAP: Record<NavbarPage, string> = {
  dashboard: "근무 스케줄",
  "work-schedule": "근무 스케줄",
  "shift-types": "근무 형태",
  "shift-patterns": "반복 패턴",
  employees: "직원",
  "company-events": "회사 이벤트",
  account: "계정 설정"
};

export function TopNavbar({ current, title, onLogout }: TopNavbarProps) {
  const currentNav = current === "dashboard" ? "work-schedule" : current;
  const breadcrumbLabel = PAGE_LABEL_MAP[current];
  const showBreadcrumb = breadcrumbLabel.trim() !== title.trim();

  return (
    <header className="top-navbar px-0 py-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="top-navbar-brand text-[10px] uppercase tracking-[0.3em] text-zinc-400">SARDI</p>
          {showBreadcrumb ? <p className="top-navbar-breadcrumb mt-1 text-[11px] font-medium text-zinc-500">{breadcrumbLabel}</p> : null}
          <h1 className="top-navbar-title text-[1.05rem] font-bold leading-tight text-zinc-100">{title}</h1>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="top-navbar-action inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-900/70 text-zinc-100 transition hover:bg-zinc-800"
          aria-label="로그아웃"
          title="로그아웃"
        >
          <LogoutIcon />
          <span className="sr-only">로그아웃</span>
        </button>
      </div>
      <nav className="mt-2 overflow-x-auto pb-0">
        <ul className="flex min-w-max items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = item.key === currentNav;
            return (
              <li key={`flat-${item.key}`}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`top-navbar-link inline-flex min-h-[36px] items-center justify-center rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition md:text-sm ${
                    active
                      ? "top-navbar-link-active border-zinc-500 bg-zinc-100 text-zinc-900"
                      : "top-navbar-link-inactive border-zinc-600 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
