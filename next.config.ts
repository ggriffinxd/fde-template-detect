import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser automation packages use native binaries — must not be bundled.
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
};

export default nextConfig;
