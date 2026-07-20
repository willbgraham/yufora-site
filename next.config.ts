import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm database drivers stay external to the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  experimental: {
    serverActions: {
      // Photo uploads go through server actions.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      // Product photos on Vercel Blob.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [
      {
        // Only the embed routes may be framed — by any site (that's the product).
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
      {
        // Everything else (incl. admin) refuses framing: clickjacking guard.
        source: "/((?!embed/).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
