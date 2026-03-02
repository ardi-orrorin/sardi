import type { NextConfig } from "next";

const backendBaseUrlRaw = process.env.SARDI_BACKEND_URL ?? process.env.NYAA_BACKEND_URL ?? "http://localhost:8080";
const backendBaseUrl = backendBaseUrlRaw.endsWith("/") ? backendBaseUrlRaw.slice(0, -1) : backendBaseUrlRaw;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  experimental: {
    optimizePackageImports: ["dayjs"]
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/caldav",
        destination: `${backendBaseUrl}/api/v1/sardi/public/caldav`
      },
      {
        source: "/.well-known/caldav/",
        destination: `${backendBaseUrl}/api/v1/sardi/public/caldav/`
      },
      {
        source: "/api/v1/sardi/public/ics",
        destination: `${backendBaseUrl}/api/v1/sardi/public/ics`
      },
      {
        source: "/api/v1/sardi/public/ics/:token",
        destination: `${backendBaseUrl}/api/v1/sardi/public/ics/:token`
      },
      {
        source: "/api/v1/sardi/public/caldav",
        destination: `${backendBaseUrl}/api/v1/sardi/public/caldav`
      },
      {
        source: "/api/v1/sardi/public/caldav/:path*",
        destination: `${backendBaseUrl}/api/v1/sardi/public/caldav/:path*`
      }
    ];
  }
};

export default nextConfig;
