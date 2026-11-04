import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Generates route types into .next/types, so a typo in a `Link href` or a
  // `router.push` is a compile error rather than a 404 someone finds later.
  typedRoutes: true,
  experimental: {
    // Types the environment variables the dev server loaded.
    typedEnv: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // 3D assets never change in place (we rename on change), so let browsers and the CDN keep them.
    const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
      { source: "/models/:path*", headers: immutable },
      { source: "/textures/:path*", headers: immutable },
      { source: "/hdri/:path*", headers: immutable },
    ];
  },
};

export default nextConfig;
