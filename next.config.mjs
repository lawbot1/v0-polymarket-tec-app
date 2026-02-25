/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
 // ✅ Fix for Next.js 16 Turbopack + webpack config conflict
  turbopack: {},
}

export default nextConfig
