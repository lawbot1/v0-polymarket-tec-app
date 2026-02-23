/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
  ],
  turbopack: {
    resolveAlias: {
      '@solana-program/memo': './lib/empty-stub.js',
      '@solana/kit': './lib/empty-stub.js',
      '@solana-program/system': './lib/empty-stub.js',
      '@solana-program/token': './lib/empty-stub.js',
      '@solana-program/token-2022': './lib/empty-stub.js',
      '@solana-program/compute-budget': './lib/empty-stub.js',
      '@solana/sysvars': './lib/empty-stub.js',
    },
  },
}

export default nextConfig
