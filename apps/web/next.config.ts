import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@clipengine/supabase",
    "@clipengine/transcriber",
    "@clipengine/repurposer",
    "@clipengine/brand-voice",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
