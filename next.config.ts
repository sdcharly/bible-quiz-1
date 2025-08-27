import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
      // Font optimization headers
      {
        source: "/_next/static/media/(.*).woff2",
        locale: false,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
      // PWA manifest headers
      {
        source: "/manifest.json",
        locale: false,
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry config for production only
const sentryWebpackPluginOptions = {
  silent: true, // Suppresses source map uploading logs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

const config = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;
