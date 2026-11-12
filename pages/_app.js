// Noto Serif SC Black for titles, in unicode-range slices fetched on demand.
import '@fontsource/noto-serif-sc/900.css'
import '../styles/globals.css'
import ShareMeta from '../components/ShareMeta'
import { DEFAULT_DESCRIPTION, HOME_TITLE } from '../lib/seo'

/**
 * Default share tags for pages that do not render their own ShareMeta.
 * Keep this before <Component>: next/head keeps the later tag when keys match,
 * so a page ShareMeta replaces these on /, /blog, and /blog/[id].
 */
export default function App({ Component, pageProps }) {
  return (
    <>
      <ShareMeta
        title={HOME_TITLE}
        description={DEFAULT_DESCRIPTION}
        path="/"
        image="/og-default.webp"
        type="website"
      />
      <Component {...pageProps} />
    </>
  )
}
