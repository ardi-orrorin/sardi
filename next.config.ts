import type { NextConfig } from "next";

const backendBaseUrlRaw =
  process.env.BUILD_SARDI_BACKEND_URL ?? (process.env.NODE_ENV === "development" ? "http://localhost:8080" : undefined);
if (!backendBaseUrlRaw) {
  throw new Error("BUILD_SARDI_BACKEND_URL is required for production build rewrites.");
}

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
  }
};

export default nextConfig;
