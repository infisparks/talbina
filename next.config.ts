import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/ev0-api/:path*",
        destination: "https://ev0.infispark.in/:path*",
      },
    ];
  },
};

export default nextConfig;
