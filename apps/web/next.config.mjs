/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.COMANDINHA_WEB_DIST_DIR ?? '.next',
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
    ],
  },
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'exemplo.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'exemplo.com', port: '', pathname: '/**' },
      { protocol: 'http', hostname: 'i.imgur.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com', port: '', pathname: '/**' },
      { protocol: 'http', hostname: 'imgur.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'imgur.com', port: '', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK,
  },
};

export default nextConfig;
