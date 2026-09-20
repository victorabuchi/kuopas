import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Complaint photos and short videos are posted through server actions.
    serverActions: { bodySizeLimit: '60mb' },
  },
};

export default nextConfig;
