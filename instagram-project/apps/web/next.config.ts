import path from 'node:path';
import type { NextConfig } from 'next';

const requestConfig = './src/i18n/request.ts';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@insta/shared'],
  turbopack: {
    resolveAlias: {
      'next-intl/config': requestConfig,
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'next-intl/config': path.resolve(__dirname, requestConfig),
    };
    return config;
  },
};

export default nextConfig;