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
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
      }
    }
    // Stub missing Solana modules that Privy v3 internally references
    config.resolve.alias = {
      ...config.resolve.alias,
      '@solana-program/memo': false,
      '@solana/kit': false,
      '@solana-program/system': false,
      '@solana-program/token': false,
      '@solana-program/token-2022': false,
      '@solana-program/compute-budget': false,
      '@solana/sysvars': false,
    }
    return config
  },
}

export default nextConfig