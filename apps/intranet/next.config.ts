import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@hebron/ui",
    "@hebron/auth",
    "@hebron/db",
    "@hebron/types",
    "@hebron/validators",
    "@hebron/config",
  ],
};

export default nextConfig;
