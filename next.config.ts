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
};

export default nextConfig;
