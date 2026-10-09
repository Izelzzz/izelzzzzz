import { Fragment, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { makeCoverDataUri, optimizeListCoverUrl, shouldBypassNextImageOptimizer } from '../../lib/cover'
import { getPublicPageData } from '../../lib/notion'

function formatZhDate(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  } catch {
    return String(isoString)
  }
}

function isHttpUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeHttpUrl(url) {
  if (!url) return null
  // Notion can return a URL with surrounding whitespace or punctuation from
  // pasted rich text. Strip only delimiters that cannot be part of a URL.
  const text = String(url)
    .trim()
    .replace(/^[([{"'\s]+/, '')
    .replace(/[)\]}>,。！？；：\s]+$/, '')
  return isHttpUrl(text) ? text : null
}

function findUrl(value, seen = new Set()) {
  if (!value || seen.has(value)) return null
  if (typeof value === 'string') return normalizeHttpUrl(value)
  if (typeof value !== 'object') return null
  seen.add(value)

  // Prefer the fields used by Notion's bookmark, embed and link_preview
  // payloads, then fall back to nested values for API/proxy variations.
  for (const key of ['url', 'href', 'source', 'link']) {
    const url = findUrl(value[key], seen)
    if (url) return url
  }
  for (const child of Object.values(value)) {
    const url = findUrl(child, seen)
    if (url) return url
  }
  return null
}

function extractHrefFromRichTextItem(t) {
  const direct = normalizeHttpUrl(t?.href)
  if (direct) return direct

  // Notion rich_text 的部分链接会在这里
  const url = normalizeHttpUrl(t?.text?.link?.url)
  if (url) return url

  // 兜底：如果 plain_text 本身就是 URL
  const plain = t?.plain_text
  if (plain) {
    const match = String(plain).match(/https?:\/\/[^\s<>]+/i)
    const plainUrl = normalizeHttpUrl(match?.[0])
    if (plainUrl) return plainUrl
  }

  return null
}

function extractUrlsFromRichText(richText) {
  const out = []
  const seen = new Set()
  const list = Array.isArray(richText) ? richText : []

  for (const t of list) {
    const direct = normalizeHttpUrl(extractHrefFromRichTextItem(t))
    if (direct && !seen.has(direct)) {
      seen.add(direct)
      out.push(direct)
    }
  }

  return out
}

function getNotionLinkTitle(source, href) {
  const list = Array.isArray(source) ? source : []
  const linkedTitle = list
    .filter(item => extractHrefFromRichTextItem(item) === href)
    .map(item => String(item?.plain_text ?? ''))
    .join('')
    .trim()
  if (linkedTitle && normalizeHttpUrl(linkedTitle) !== href) return linkedTitle

  const caption = list.map(item => String(item?.plain_text ?? '').trim()).filter(Boolean).join(' ')
  return caption && normalizeHttpUrl(caption) !== href ? caption : null
}

const NOTION_FG = {
  gray: '#6b7280',
  brown: '#92400e',
  orange: '#ea580c',
  yellow: '#a16207',
  green: '#15803d',
  blue: '#1d4ed8',
  purple: '#7e22ce',
  pink: '#be185d',
  red: '#b91c1c',
}

const NOTION_BG = {
  gray: '#f3f4f6',
  brown: '#fef3c7',
  orange: '#ffedd5',
  yellow: '#fef9c3',
  green: '#dcfce7',
  blue: '#dbeafe',
  purple: '#f3e8ff',
  pink: '#fce7f3',
  red: '#fee2e2',
}

function notionColorStyle(color) {
  if (!color || color === 'default') return null
  if (String(color).endsWith('_background')) {
    const k = String(color).replace('_background', '')
    const bg = NOTION_BG[k]
    return bg ? { backgroundColor: bg, borderRadius: 3, padding: '0 0.2em' } : null
  }
  const fg = NOTION_FG[color]
  return fg ? { color: fg } : null
}

function wrapRichSegment(children, annotations) {
  const a = annotations || {}
  let n = children
  if (a.code) {
    n = (
      <code className="px-1 py-0.5 rounded bg-slate-100 text-[0.9em] font-mono text-accent">
        {n}
      </code>
    )
  }
  if (a.strikethrough) n = <del className="opacity-80">{n}</del>
  if (a.underline) n = <span className="underline">{n}</span>
  if (a.italic) n = <em>{n}</em>
  if (a.bold) n = <strong className="font-semibold text-accent">{n}</strong>
  const cs = notionColorStyle(a.color)
  if (cs) n = <span style={cs}>{n}</span>
  return n
}

/**
 * 渲染 Notion rich_text：链接、加粗等标注、段落内换行（\n）
 */
function renderRichText(richText, { hideLinks = false } = {}) {
  const list = Array.isArray(richText) ? richText : []
  const out = []
  let outKey = 0

  list.forEach((t, i) => {
    const raw = t?.plain_text ?? ''
    const lines = raw.split('\n')
    const href = extractHrefFromRichTextItem(t)

    if (hideLinks && href) return
    lines.forEach((line, li) => {
      if (li > 0) {
        out.push(<br key={`notion-br-${i}-${li}-${outKey++}`} />)
      }
      if (href && isHttpUrl(href) && !hideLinks) {
        out.push(
          <a
            key={`notion-a-${i}-${li}-${outKey++}`}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-black/20 hover:decoration-black/60"
          >
            {wrapRichSegment(line || href, t.annotations)}
          </a>
        )
      } else {
        out.push(
          <Fragment key={`notion-t-${i}-${li}-${outKey++}`}>
            {wrapRichSegment(line, t.annotations)}
          </Fragment>
        )
      }
    })
  })

  return out
}

function getNotionImageSrc(blockImage) {
  if (!blockImage) return null
  if (blockImage.type === 'external') return blockImage.external?.url || null
  if (blockImage.type === 'file') return blockImage.file?.url || null
  return blockImage.external?.url || blockImage.file?.url || null
}

function NotionImage({ src }) {
  // Full article width (no 520px cap). Prefer next/image; Unsplash URLs are
  // CDN-resized. Cloudflare currently passthroughs /_next/image for other
  // hosts, so those stay unoptimized but still get sizes/priority plumbing.
  const optimized = optimizeListCoverUrl(src, { width: 1200, quality: 60 })
  if (!optimized) return null
  if (optimized.startsWith('data:')) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URI placeholders
      <img src={optimized} alt="" className="mx-auto block h-auto w-full max-w-full rounded-lg object-contain" />
    )
  }

  return (
    <div className="notion-image-frame mx-auto w-full overflow-hidden rounded-lg bg-primary/25">
      <Image
        src={optimized}
        alt=""
        width={1200}
        height={675}
        sizes="(max-width: 768px) calc(100vw - 2rem), 960px"
        className="mx-auto h-auto max-h-[min(80vh,900px)] w-full object-contain"
        loading="lazy"
        decoding="async"
        unoptimized={shouldBypassNextImageOptimizer(optimized)}
      />
    </div>
  )
}

function LinkCard({ href, title }) {
  const label = href.replace(/^https?:\/\//, '')
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-4 block tile p-4 hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-accent/30"
      aria-label={title ? `打开 ${title}` : '打开网页'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {title ? <div className="text-sm font-semibold text-accent break-words">{title}</div> : null}
          <div className={title ? 'mt-1 text-xs text-mosaic break-all' : 'text-xs text-mosaic break-all'}>{label}</div>
        </div>
        <div className="text-xs text-mosaic shrink-0">打开网页 ↗</div>
      </div>
    </a>
  )
}

export async function getStaticPaths() {
  // 构建时不预生成任何页面，全部使用按需生成（fallback: 'blocking'）
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps(context) {
  const id = String(context.params.id)
  try {
    const result = await getPublicPageData(id)
    if (!result) return { notFound: true }
    return {
      props: { page: result.page, blocks: result.blocks, error: null },
      revalidate: 3600, // 1 hour
    }
  } catch (error) {
    if (error?.status === 404 || error?.code === 'object_not_found') return { notFound: true }
    return {
      props: {
        page: null,
        blocks: [],
        error: error?.message ? String(error.message).slice(0, 160) : '文章读取失败',
      },
      revalidate: 60, // Retry after 1 minute
    }
  }
}

function renderLinkCards(urls, keyPrefix, renderedUrls, titleSource) {
  if (!Array.isArray(urls) || urls.length === 0) return null
  const uniqueUrls = urls.filter(href => {
    if (!renderedUrls) return true
    const occurrenceKey = `${keyPrefix}:${href}`
    if (renderedUrls.has(occurrenceKey)) return false
    renderedUrls.add(occurrenceKey)
    return true
  })
  if (uniqueUrls.length === 0) return null
  return (
    <div className="space-y-4">
      {uniqueUrls.map((href, index) => (
        <LinkCard
          key={`${keyPrefix}-link-${index}`}
          href={href}
          title={getNotionLinkTitle(titleSource, href)}
        />
      ))}
    </div>
  )
}

function renderChildren(block, renderedUrls) {
  if (!Array.isArray(block?.children) || block.children.length === 0) return null
  return <div className="mt-2">{renderBlocks(block.children, renderedUrls)}</div>
}

function renderHeadingByType(type, id, rich, urls, renderedUrls) {
  if (type === 'heading_1') {
    return (
      <div key={id} className="my-5">
        <h2 className="text-2xl font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h2>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  if (type === 'heading_2') {
    return (
      <div key={id} className="my-4">
        <h3 className="text-xl font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h3>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  if (type === 'heading_3') {
    return (
      <div key={id} className="my-3">
        <h4 className="text-lg font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h4>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  if (type === 'heading_4') {
    return (
      <div key={id} className="my-3">
        <h5 className="text-base font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h5>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  if (type === 'heading_5') {
    return (
      <div key={id} className="my-2">
        <h5 className="text-sm font-semibold uppercase tracking-wide whitespace-pre-wrap break-words">{renderRichText(rich)}</h5>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  if (type === 'heading_6') {
    return (
      <div key={id} className="my-2">
        <h6 className="text-sm font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h6>
        {renderLinkCards(urls, id, renderedUrls, rich)}
      </div>
    )
  }
  return null
}

function renderBlock(block, renderedUrls) {
  const { type, id } = block
  const value = block[type]
  const rich = Array.isArray(value?.rich_text) ? value.rich_text : []
  const urls = extractUrlsFromRichText(rich)
  switch (type) {
    case 'bookmark': {
      const urlString = findUrl(value) || findUrl(block)
      if (urlString) {
        return (
          <div key={id}>
            {renderLinkCards([urlString], id, renderedUrls, value?.caption)}
          </div>
        )
      }
      return null
    }
    case 'link_preview': {
      const urlString = findUrl(value) || findUrl(block)
      if (urlString) {
        return (
          <div key={id}>
            {renderLinkCards([urlString], id, renderedUrls)}
          </div>
        )
      }
      return null
    }
    case 'embed': {
      const urlString = findUrl(value) || findUrl(block)
      if (urlString) {
        return (
          <div key={id}>
            {renderLinkCards([urlString], id, renderedUrls, value?.caption)}
          </div>
        )
      }
      return null
    }
    case 'image': {
      const src = getNotionImageSrc(value)
      if (!src) return null
      const caption = Array.isArray(value?.caption) ? renderRichText(value.caption) : null
      return (
        <figure key={id} className="my-4">
          <NotionImage src={src} />
          {caption?.length ? (
            <figcaption className="text-sm text-mosaic mt-2">{caption}</figcaption>
          ) : null}
        </figure>
      )
    }
    case 'divider':
      return <hr key={id} className="notion-hr" />
    case 'paragraph':
      if (rich.length === 0) {
        return <div key={id} className="my-3 h-5" aria-hidden="true" />
      }
      return (
        <div key={id} className="my-3">
          <p className="text-mosaic whitespace-pre-wrap break-words">{renderRichText(rich)}</p>
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </div>
      )
    case 'quote':
      return (
        <blockquote key={id} className="my-4 border-l-4 border-black/15 bg-slate-50/80 px-4 py-3 rounded-r-lg">
          <div className="text-mosaic whitespace-pre-wrap break-words italic">{renderRichText(rich)}</div>
          {renderChildren(block, renderedUrls)}
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </blockquote>
      )
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4':
    case 'heading_5':
    case 'heading_6':
      return renderHeadingByType(type, id, rich, urls, renderedUrls)
    case 'bulleted_list_item':
      return (
        <li key={id} className="text-mosaic whitespace-pre-wrap break-words">
          <div>{renderRichText(rich)}</div>
          {renderChildren(block, renderedUrls)}
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id} className="text-mosaic whitespace-pre-wrap break-words">
          <div>{renderRichText(rich)}</div>
          {renderChildren(block, renderedUrls)}
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </li>
      )
    default:
      const blockUrl = findUrl(block)
      return (
        <Fragment key={id}>
          {renderChildren(block, renderedUrls)}
          {blockUrl && !urls.includes(blockUrl) ? renderLinkCards([blockUrl], id, renderedUrls) : null}
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </Fragment>
      )
  }
}

function renderBlocks(blocks, renderedUrls = new Set()) {
  const content = []
  let listType = null
  let listBuffer = []

  const flushList = key => {
    if (listBuffer.length === 0) return
    const ListWrapper = listType === 'numbered_list_item' ? 'ol' : 'ul'
    const listClass = listType === 'numbered_list_item' ? 'list-decimal' : 'list-disc'
    content.push(
      <ListWrapper key={key} className={`${listClass} my-3`}>
        {listBuffer.map(block => renderBlock(block, renderedUrls))}
      </ListWrapper>
    )
    listBuffer = []
    listType = null
  }

  blocks.forEach((block, idx) => {
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      if (!listType) listType = block.type
      if (block.type === listType) {
        listBuffer.push(block)
      } else {
        flushList(`${idx}-list`)
        listBuffer = [block]
        listType = block.type
      }
    } else {
      flushList(`${idx}-list`)
      content.push(renderBlock(block, renderedUrls))
    }
  })

  flushList('last-list')
  return content
}

export default function BlogDetail({ page, blocks, error }) {
  const title = useMemo(
    () => (page ? String(page.properties['标题']?.title?.[0]?.plain_text || '未命名') : ''),
    [page],
  )

  const cover = useMemo(() => {
    if (!page) return null
    const notionCover =
      page?.cover?.type === 'external'
        ? page?.cover?.external?.url
        : page?.cover?.type === 'file'
          ? page?.cover?.file?.url
          : page?.cover?.external?.url || page?.cover?.file?.url
    if (notionCover) return optimizeListCoverUrl(notionCover, { width: 1200, quality: 60 })
    // Fallback SVG is expensive; only build when needed and memoize.
    return makeCoverDataUri(title || '未命名')
  }, [page, title])

  const tagList = useMemo(
    () => (page ? page.properties['Tag']?.multi_select?.map(t => t.name) || [] : []),
    [page],
  )

  const desc = useMemo(
    () => (page ? page.properties.Description?.rich_text?.[0]?.plain_text || '' : ''),
    [page],
  )

  const content = useMemo(() => (page ? renderBlocks(blocks || []) : []), [page, blocks])

  if (!page) {
    return (
      <div className="archive-page archive-error-page min-h-screen bg-primary text-accent flex flex-col items-center justify-center p-6">
        <div className="archive-error-card tile p-6 max-w-xl w-full">
          <h1 className="archive-title text-2xl font-semibold">文章不存在或获取失败</h1>
          {error && <div className="text-sm text-mosaic mt-2 break-words">{error}</div>}
          <div className="mt-5">
            <Link href="/blog" className="archive-action inline-flex px-4 py-2 text-sm">
              返回文章列表
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="archive-page archive-detail min-h-screen bg-primary text-accent">
      <Head>
        <title>{title} - 碳基生物Izel狂想曲</title>
        {!cover.startsWith('data:') ? (
          <link rel="preload" as="image" href={cover} fetchPriority="high" />
        ) : null}
      </Head>

      <header className="archive-nav sticky top-0 z-30">
        <div className="archive-nav-inner mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="archive-brand font-semibold tracking-tight text-lg">
            碳基生物Izel狂想曲
          </Link>
          <nav className="archive-nav-links flex items-center gap-6 text-sm">
            <Link href="/blog" className="text-mosaic">
              文章
            </Link>
          </nav>
        </div>
      </header>

      <main className="archive-main flex-1 mx-auto px-4 py-12">
        <div>
          <Link href="/blog" className="archive-backlink text-sm text-mosaic">
            ← 返回文章列表
          </Link>
          <h1 className="archive-detail-title mt-3 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.16]">
            {title}
          </h1>
          {page?.created_time ? (
            <div className="archive-meta mt-4 text-sm text-mosaic">
              创建于 {formatZhDate(page.created_time)}
            </div>
          ) : null}

          {tagList.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tagList.map(t => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className="archive-filter archive-tag"
                  aria-label={`查看 ${t} 标签文章`}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          {desc && <p className="archive-description mt-5 text-mosaic text-lg leading-relaxed">{desc}</p>}
        </div>

        <div className="archive-article-panel p-8">
          <article className="notion-content">
            {cover ? (
              <div className="archive-detail-cover-frame relative mb-6 w-full aspect-[16/9] overflow-hidden bg-primary/30">
                {cover.startsWith('data:') ? (
                  // eslint-disable-next-line @next/next/no-img-element -- SVG data URI fallback cover
                  <img
                    src={cover}
                    alt={`${title} 封面`}
                    className="archive-detail-cover absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={cover}
                    alt={`${title} 封面`}
                    fill
                    priority
                    sizes="(max-width: 768px) calc(100vw - 2rem), 960px"
                    className="archive-detail-cover object-cover"
                    unoptimized={shouldBypassNextImageOptimizer(cover)}
                  />
                )}
              </div>
            ) : null}
            {content.length > 0 ? content : <div className="text-mosaic">暂无正文内容</div>}
          </article>
        </div>
      </main>

      <footer className="archive-footer py-10 text-center text-sm text-mosaic">
        Powered by Notion API
      </footer>
    </div>
  )
}
