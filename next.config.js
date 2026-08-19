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
  },
}

module.exports = nextConfig
