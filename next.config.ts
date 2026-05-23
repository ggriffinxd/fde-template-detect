import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses native binaries — must not be bundled by webpack/turbopack.
  serverExternalPackages: ["playwright", "playwright-core"],
};

export default nextConfig;
