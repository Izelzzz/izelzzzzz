/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace']
      },
      colors: {
        /* 主背景（接近极简作品集的留白感） */
        primary: '#F8FAFC',
        /* 深色文字/按钮主体 */
        accent: '#0F172A',
        /* 次要文字（用于说明/元信息） */
        mosaic: '#475569',
        /* 卡片背景（与 `.tile` 的 CSS 保持一致） */
        tile: '#FFFFFF',
        tileHover: '#F1F5F9'
      }
    },
  },
  plugins: [],
}
