import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for GitHub Pages deployment
  // output: 'export', // <-- Disabled because you requested a Next.js API route for emails

  // Required when using `output: 'export'` – Next.js Image Optimisation
  // is unavailable in static export mode, so we fall back to unoptimised images.
  images: {
    unoptimized: true,
  },

  // Uncomment and set these if deploying to a GitHub Pages sub-path, e.g.
  // https://<user>.github.io/<repo>/
  // basePath: '/<repo-name>',
  // assetPrefix: '/<repo-name>/',

  // Enable React strict mode for better dev-time warnings
  reactStrictMode: true,
};

export default nextConfig;
