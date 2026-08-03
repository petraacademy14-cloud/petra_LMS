import type { NextConfig } from "next";

const legacyLogoPaths = [
  "/petra-academy-logo-v3.webp",
  "/petra-academy-logo.webp",
  "/petra-academy-logo.jpg",
  "/petra-academy-logo.svg",
  "/icon.svg",
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  async redirects() {
    return legacyLogoPaths.map((source) => ({
      source,
      destination: "/brand/petra-logo.webp",
      permanent: true,
    }));
  },
};

export default nextConfig;
