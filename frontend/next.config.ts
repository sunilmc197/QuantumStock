import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,          // faster HMR — skip double-render in dev
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
    ],
  },
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},
};

export default nextConfig;
