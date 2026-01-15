import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable static generation for API routes
  output: 'standalone',
};

export default nextConfig;
