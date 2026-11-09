import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Generates route types into .next/types, so a typo in a `Link href` or a
  // `router.push` is a compile error rather than a 404 someone finds later.
  typedRoutes: true,
  // Seller banners and phone photos, uploaded to Cloudinary (docs/CLOUDINARY-SETUP.md).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/*/image/upload/**" },
    ],
  },
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
    // 3D assets are regenerated in place (same file names), so browsers keep them for an hour and
    // the CDN for a day, then revalidate in the background. Repeat visits stay fast on mobile data.
    const assets = [
      {
        key: "Cache-Control",
        value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    ];
    return [
      { source: "/models/:path*", headers: assets },
      { source: "/textures/:path*", headers: assets },
      { source: "/hdri/:path*", headers: assets },
    ];
  },
};

export default nextConfig;
