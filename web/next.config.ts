import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export (e.g. GitHub Pages). Omit if you need Route Handlers like /api/*.
  output: 'export',
  // Image optimisation is unavailable with static export; use unoptimised images.
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
