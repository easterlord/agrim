import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` powers the sandbox preview server.
  // `scripts/ghp-build.mjs` sets NEXT_EXPORT=1 to switch to a
  // fully static export (`out/`) for GitHub Pages.
  ...(process.env.NEXT_EXPORT === "1" ? { output: "export" as const } : { output: "standalone" as const }),
  images: { unoptimized: true },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
