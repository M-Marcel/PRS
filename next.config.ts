import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma 7.x engine internals and the pg adapter out of the server
  // bundle so Node's native `require` resolves them at runtime. The generated
  // client at `src/generated/prisma/*` loads `@prisma/client` internals, which
  // are in Next's default externals list, but the custom output path and the
  // pg adapter are not — opt them out explicitly.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
