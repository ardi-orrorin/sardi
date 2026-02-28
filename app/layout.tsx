import type { Metadata } from "next";
import { ThemeToggleFab } from "@/app/_services/components/theme-toggle-fab";

import "./globals.css";

export const metadata: Metadata = {
  title: "SARDI | 교대 스케줄",
  description: "모바일 우선 교대근무 스케줄러"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <ThemeToggleFab />
      </body>
    </html>
  );
}
