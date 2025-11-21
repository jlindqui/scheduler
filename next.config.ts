import type { NextConfig } from 'next';
import { webpack } from 'next/dist/compiled/webpack/webpack';

const nextConfig: NextConfig = {
  transpilePackages: ['@react-email/components', '@react-email/render'],
  serverExternalPackages: ['pdf-parse'],

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    }
  },

  turbopack: {
    resolveAlias: {
      canvas: './empty-module.ts',
    }
  }
};

export default nextConfig;

