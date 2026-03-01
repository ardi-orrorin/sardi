"use client";

import Link from "next/link";

type NavbarPage = "dashboard" | "shifts" | "account";

type TopNavbarProps = {
  current: NavbarPage;
  title: string;
  onLogout: () => void | Promise<void>;
};

type IconProps = {
  className?: string;
};

function LogoutIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

const NAV_ITEMS: Array<{ key: NavbarPage; href: string; label: string }> = [
  { key: "dashboard", href: "/", label: "스케줄" },
  { key: "shifts", href: "/settings/shifts", label: "근무 설정" },
  { key: "account", href: "/settings/account", label: "계정 설정" }
];

export function TopNavbar({ current, title, onLogout }: TopNavbarProps) {
  return (
    <header className="top-navbar px-0 py-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="top-navbar-brand text-[10px] uppercase tracking-[0.3em] text-zinc-400">SARDI</p>
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
            const active = item.key === current;
            return (
              <li key={item.key}>
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
