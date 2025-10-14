import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
