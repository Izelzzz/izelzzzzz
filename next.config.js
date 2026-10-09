/** @type {import('next').NextConfig} */
const nextConfig = {
  // 开发服务器与生产构建使用不同目录，避免热更新读取不完整产物。
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  images: {
    // Covers come from user-selected Notion/external URLs, so the optimizer
    // must accept arbitrary HTTPS hosts. The requested width is still capped
    // by the responsive `sizes` value in the list page.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // Prefer compact formats when the optimizer actually runs.
    // Note: on Cloudflare OpenNext today `/_next/image` often passthroughs
    // full origin bytes — list covers use optimizeListCoverUrl + unoptimized.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24,
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [256, 320, 384, 480, 640],
  },
}

module.exports = nextConfig
