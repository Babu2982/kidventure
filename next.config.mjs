/** @type {import('next').NextConfig} */
const isCapacitorBuild = process.env.BUILD_TARGET === "capacitor";

const nextConfig = {
  reactStrictMode: true,
  // Static export is required for Capacitor (bundled into the APK).
  // It is also harmless for Vercel: every route is already static.
  // We gate it behind BUILD_TARGET so Vercel keeps full SSR features
  // available if you add server routes later.
  ...(isCapacitorBuild ? { output: "export" } : {}),
  images: { unoptimized: true },
};
export default nextConfig;
