import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@tetris/analytics",
    "@tetris/ui",
    "@tetris/shared-types",
    "@tetris/game-engine"
  ]
};

export default nextConfig;
