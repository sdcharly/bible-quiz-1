import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Performance optimizations
  reactStrictMode: true,
  
  // Optimize production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },
  
  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "@/components/ui",
      "@/components/educator-v2",
      "lucide-react"
    ],
  },
  
  // Headers for caching static assets
  async headers() {
    return [
      {
        source: "/(.*).js",
        locale: false,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*).css",
        locale: false,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
