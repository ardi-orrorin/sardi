import { ThemeToggleFab } from "@/app/_services/components/theme-toggle-fab";
import { ProductionConsoleGuard } from "@/app/_services/components/production-console-guard";
import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

const THEME_STORAGE_KEY = "sardi-theme-mode";

const themeBootstrapScript = `
  (() => {
    try {
      const stored = window.localStorage.getItem("${THEME_STORAGE_KEY}");
      const mode =
        stored === "light" || stored === "dark"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      const root = document.documentElement;
      root.classList.remove("theme-light", "theme-dark");
      root.classList.add(mode === "light" ? "theme-light" : "theme-dark");
    } catch (error) {
      document.documentElement.classList.add("theme-dark");
    }
  })();
`;

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
    <html lang="ko" suppressHydrationWarning>
      <body className="antialiased">
        <Script id="sardi-theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
        <ProductionConsoleGuard />
        {children}
        <ThemeToggleFab />
      </body>
    </html>
  );
}
