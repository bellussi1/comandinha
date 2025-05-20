const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "exemplo.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "exemplo.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK
  }
};

module.exports = nextConfig;