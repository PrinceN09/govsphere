import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Standalone output bundles the server and all dependencies into .next/standalone.
  // Required for the production Docker image (multi-stage copy from standalone dir).
  output: "standalone",

  // Transpile internal monorepo packages
  transpilePackages: [
    "@prinodia/ui",
    "@prinodia/types",
    "@prinodia/i18n",
    "@prinodia/config",
    "@prinodia/auth",
    "@prinodia/utils",
  ],

  // Internationalization handled by next-intl middleware
  // Locale routing is managed at middleware level

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  // Webpack customization
  webpack(config) {
    return config;
  },
};

export default nextConfig;
