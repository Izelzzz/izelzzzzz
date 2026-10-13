import { buildShareMeta } from '../lib/seo'

/**
 * Open Graph + Twitter Card tags. Render inside next/head <Head>.
 */
export default function ShareMeta({ title, description, path, image, type = 'website' }) {
  const meta = buildShareMeta({ title, description, path, image, type })

  return (
    <>
      <meta name="description" content={meta.description} />

      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:type" content={meta.type} />
      <meta property="og:site_name" content={meta.siteName} />
      <meta property="og:image" content={meta.imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.imageUrl} />

      <link rel="canonical" href={meta.url} />
    </>
  )
}
