import { Head, Html, Main, NextScript } from 'next/document'

/**
 * Applies a stored 日出/日落 choice before first paint so the page never
 * flashes the wrong theme. With no stored choice the CSS follows the system.
 */
const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()"

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* Title faces used above the fold: fetch early so headings do not flash a fallback. */}
        <link rel="preload" href="/fonts/dm-serif-display-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/noto-serif-sc-ui.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
