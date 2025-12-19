import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  images: {
    unoptimized: true, // 👈 required for static export (no Image Optimization)
  },
  // Optimize build performance for static export
  typescript: {
    // Skip type checking during build (faster builds, type check separately)
    ignoreBuildErrors: false, // Keep false for production, set true only if typecheck is blocking
  },
  eslint: {
    // Skip ESLint during build (faster builds, lint separately)
    ignoreDuringBuilds: false, // Keep false for production, set true only if linting is blocking
  },
  // Ensure static export doesn't try to generate dynamic routes
  trailingSlash: false,
  // Disable any runtime config that might cause issues
  reactStrictMode: true,
};

export default nextConfig;
