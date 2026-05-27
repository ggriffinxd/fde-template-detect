import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone: produces .next/standalone/ — a self-contained Node server that
  // doesn't need the full node_modules at runtime. Required for the Docker
  // multi-stage build; also works fine for `next start` in local development.
  output: "standalone",

  // These packages use native binaries and must NOT be bundled by
  // webpack/turbopack. They are loaded at runtime via require().
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@sparticuz/chromium",
  ],
};

export default nextConfig;
