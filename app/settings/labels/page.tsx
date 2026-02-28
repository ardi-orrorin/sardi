import { AUTH_COOKIE_NAME } from "@/app/_commons/constants/auth";
import LabelSettings from "@/app/_services/components/label-settings";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LabelSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="app-shell">
      <main className="mx-auto w-full max-w-6xl">
        <LabelSettings />
      </main>
    </div>
  );
}
