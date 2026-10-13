import Head from 'next/head'
import { buildShareMeta } from '../lib/seo'

/**
 * Open Graph + Twitter Card tags, plus the document title.
 * Renders its own next/head <Head> (do not nest this inside another <Head>).
 * Pages router only applies direct children on client navigations; stable keys
 * let Head replace the previous page's meta.
 *
 * <title> must be a single string. React 19 SSR writes an empty <title> when
 * children is an array, which is what `{name} - site` compiles to. The tab
 * title would then appear only after the client joins those children.
 */
export default function ShareMeta({ title, description, path, image, type = 'website' }) {
  const meta = buildShareMeta({ title, description, path, image, type })

  return (
    <Head>
      <title key="title">{meta.title}</title>
      <meta key="description" name="description" content={meta.description} />

      <meta key="og:title" property="og:title" content={meta.title} />
      <meta key="og:description" property="og:description" content={meta.description} />
      <meta key="og:url" property="og:url" content={meta.url} />
      <meta key="og:type" property="og:type" content={meta.type} />
      <meta key="og:site_name" property="og:site_name" content={meta.siteName} />
      <meta key="og:image" property="og:image" content={meta.imageUrl} />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={meta.title} />
      <meta key="twitter:description" name="twitter:description" content={meta.description} />
      <meta key="twitter:image" name="twitter:image" content={meta.imageUrl} />

      <link key="canonical" rel="canonical" href={meta.url} />
    </Head>
  )
}
