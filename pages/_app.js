import '../styles/globals.css'
import ShareMeta from '../components/ShareMeta'

/**
 * Default share tags for pages that do not render their own ShareMeta.
 * Keep this before <Component>: next/head keeps the later tag when keys match,
 * so a page ShareMeta replaces these on /, /blog, and /blog/[id].
 */
export default function App({ Component, pageProps }) {
  return (
    <>
      <ShareMeta
        title="IZEL / SYNAPSE ARCHIVE"
        description="你正在窥看一个神秘碳基生物的精神世界。"
        path="/"
        image="/og-default.webp"
        type="website"
      />
      <Component {...pageProps} />
    </>
  )
}
