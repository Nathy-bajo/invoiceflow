/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for @solana/wallet-adapter-* in Next.js — they expect a
    // browser-like fs/crypto environment that Webpack 5 doesn't polyfill.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
