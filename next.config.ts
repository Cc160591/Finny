import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "yahoo-finance2", "bcryptjs"],
};

export default nextConfig;
