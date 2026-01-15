import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@shared": path.resolve(__dirname, "../../packages/shared"),
    },
  },
};

export default nextConfig;
