import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/wasm database drivers stay external to the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
