import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  images: {
    unoptimized: true, // 👈 required for static export (no Image Optimization)
  },
};

export default nextConfig;
