import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tetris/ui", "@tetris/shared-types"]
};

export default nextConfig;
