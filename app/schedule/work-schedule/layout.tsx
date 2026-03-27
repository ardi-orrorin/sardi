import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

type WorkScheduleLayoutProps = {
  children: ReactNode;
};

export default async function WorkScheduleLayout({ children }: WorkScheduleLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-none">{children}</main>
    </div>
  );
}
