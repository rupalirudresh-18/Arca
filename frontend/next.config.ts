import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { unoptimized: true, remotePatterns: [{ protocol:"http", hostname:"localhost", port:"5000" }] },
};
export default nextConfig;
