import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import SchedulerDashboard from "@/app/_services/components/scheduler-dashboard";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-none">
        <SchedulerDashboard />
      </main>
    </div>
  );
}
