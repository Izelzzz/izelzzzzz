/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Covers come from user-selected Notion/external URLs, so the optimizer
    // must accept arbitrary HTTPS hosts. The requested width is still capped
    // by the responsive `sizes` value in the list page.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // Prefer a compact browser format for Notion covers.
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [320, 480, 640],
  },
}

module.exports = nextConfig
