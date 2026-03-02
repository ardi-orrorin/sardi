import { ThemeToggleFab } from "@/app/_services/components/theme-toggle-fab";
import { ProductionConsoleGuard } from "@/app/_services/components/production-console-guard";
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SARDI | 교대 스케줄",
  description: "모바일 우선 교대근무 스케줄러",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ProductionConsoleGuard />
        {children}
        <ThemeToggleFab />
      </body>
    </html>
  );
}
