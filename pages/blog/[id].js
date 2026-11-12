import { Fragment, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { makeCoverDataUri, optimizeListCoverUrl, shouldBypassNextImageOptimizer } from '../../lib/cover'
import ShareMeta from '../../components/ShareMeta'
import SiteFooter from '../../components/SiteFooter'
import SiteHeader from '../../components/SiteHeader'
import { loadBlogStaticProps } from '../../lib/blog-static-props'
import { getBlockTree, getPublicPage } from '../../lib/notion'

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

const NOTION_COLORS = new Set(['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'])

/** Notion colour annotation -> class name; the palette lives in globals.css per theme. */
function notionColorClass(color) {
  if (!color || color === 'default') return null
  const name = String(color)
  if (name.endsWith('_background')) {
    const key = name.replace('_background', '')
    return NOTION_COLORS.has(key) ? `notion-bg notion-bg-${key}` : null
  }
  return NOTION_COLORS.has(name) ? `notion-fg-${name}` : null
}

function wrapRichSegment(children, annotations) {
  const a = annotations || {}
  let n = children
  if (a.code) {
    n = (
<code>{n}</code>
    )
  }
  if (a.strikethrough) n = <del>{n}</del>
  if (a.underline) n = <u>{n}</u>
  if (a.italic) n = <em>{n}</em>
  if (a.bold) n = <strong>{n}</strong>
  const colorClass = notionColorClass(a.color)
  if (colorClass) n = <span className={colorClass}>{n}</span>
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
      <img src={optimized} alt="" className="notion-image" />
    )
  }

  return (
    <div className="notion-image-frame">
      <Image
        src={optimized}
        alt=""
        width={1200}
        height={675}
        sizes="(max-width: 768px) calc(100vw - 2.5rem), 720px"
        className="notion-image"
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
      className="link-card"
      aria-label={title ? `打开 ${title}` : '打开网页'}
    >
      <span className="link-card-text">
        {title ? <strong>{title}</strong> : null}
        <span>{label}</span>
      </span>
      <span className="link-card-arrow" aria-hidden="true">↗</span>
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
  return loadBlogStaticProps(context.params?.id, {
    getPage: getPublicPage,
    getBlockTree,
  })
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
    <div className="link-cards">
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
  return <div className="notion-children">{renderBlocks(block.children, renderedUrls)}</div>
}

const HEADING_TAGS = {
  heading_1: 'h2',
  heading_2: 'h3',
  heading_3: 'h4',
  heading_4: 'h5',
  heading_5: 'h5',
  heading_6: 'h6',
}

function renderHeadingByType(type, id, rich, urls, renderedUrls) {
  const Tag = HEADING_TAGS[type]
  if (!Tag) return null
  return (
    <Fragment key={id}>
      <Tag className={`notion-${type}`}>{renderRichText(rich)}</Tag>
      {renderLinkCards(urls, id, renderedUrls, rich)}
    </Fragment>
  )
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
        <figure key={id}>
          <NotionImage src={src} />
          {caption?.length ? (
            <figcaption>{caption}</figcaption>
          ) : null}
        </figure>
      )
    }
    case 'code': {
      const caption = Array.isArray(value?.caption) ? renderRichText(value.caption) : null
      return (
        <figure key={id}>
          <pre>
            <code>{rich.map(t => t?.plain_text ?? '').join('')}</code>
          </pre>
          {caption?.length ? <figcaption>{caption}</figcaption> : null}
        </figure>
      )
    }
    case 'table': {
      const rows = (block.children || []).filter(row => row.type === 'table_row')
      if (rows.length === 0) return null
      return (
        <div key={id} className="notion-table-scroll">
          <table>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id}>
                  {(row.table_row?.cells || []).map((cell, cellIndex) => {
                    const isHeader =
                      (value?.has_column_header && rowIndex === 0) ||
                      (value?.has_row_header && cellIndex === 0)
                    const Cell = isHeader ? 'th' : 'td'
                    return <Cell key={cellIndex}>{renderRichText(cell)}</Cell>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'divider':
      return <hr key={id} className="notion-hr" />
    case 'paragraph':
      if (rich.length === 0) {
        return <div key={id} className="notion-blank" aria-hidden="true" />
      }
      return (
        <Fragment key={id}>
          <p>{renderRichText(rich)}</p>
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </Fragment>
      )
    case 'quote':
      return (
        <blockquote key={id}>
          <div>{renderRichText(rich)}</div>
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
        <li key={id}>
          <div>{renderRichText(rich)}</div>
          {renderChildren(block, renderedUrls)}
          {renderLinkCards(urls, id, renderedUrls, rich)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id}>
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
    content.push(
      <ListWrapper key={key}>
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

const CONTENT_TOO_LARGE_COPY = '这篇文章内容太长，暂时无法完整显示'

function ArticleTooLarge() {
  return (
    <div className="site">
      <Head>
        <meta name="robots" content="noindex" />
      </Head>
      <SiteHeader current="blog" />
      <main className="article-wrap page-main">
        <p className="page-lede">{CONTENT_TOO_LARGE_COPY}</p>
        <Link href="/blog" className="back-link">
          <span aria-hidden="true">←</span> 返回 Blog
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function BlogDetail(props) {
  if (props.contentTooLarge) return <ArticleTooLarge />
  return <ArticleDetail page={props.page} blocks={props.blocks} />
}

function ArticleDetail({ page, blocks }) {
  const title = useMemo(
    () => String(page.properties['标题']?.title?.[0]?.plain_text || '未命名'),
    [page],
  )

  const cover = useMemo(() => {
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
    () => page.properties['Tag']?.multi_select?.map(t => t.name) || [],
    [page],
  )

  const desc = useMemo(
    () => page.properties.Description?.rich_text?.[0]?.plain_text || '',
    [page],
  )

  const content = useMemo(() => renderBlocks(blocks || []), [blocks])

  return (
    <div className="site">
      <Head>
        {!cover.startsWith('data:') ? (
          <link rel="preload" as="image" href={cover} fetchPriority="high" />
        ) : null}
      </Head>
      <ShareMeta
        title={title}
        description={desc || 'Izel 的随思随想'}
        path={`/blog/${page.id}`}
        image={cover}
        type="article"
      />
      <SiteHeader current="blog" />

      <main className="article-wrap page-main">
        <header className="article-head">
          <Link href="/blog" className="back-link">
            <span aria-hidden="true">←</span> Blog
          </Link>
          <h1>{title}</h1>
          {desc ? <p className="article-desc">{desc}</p> : null}
          <div className="article-meta">
            {page?.created_time ? (
              <time dateTime={page.created_time}>{formatZhDate(page.created_time)}</time>
            ) : null}
            {tagList.map(t => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className="chip chip-small"
                aria-label={`查看 ${t} 标签`}
              >
                {t}
              </Link>
            ))}
          </div>
        </header>

        {cover ? (
          <div className="article-cover">
            {cover.startsWith('data:') ? (
              // eslint-disable-next-line @next/next/no-img-element -- SVG data URI fallback cover
              <img src={cover} alt={`${title} 封面`} className="cover-img" />
            ) : (
              <Image
                src={cover}
                alt={`${title} 封面`}
                fill
                priority
                sizes="(max-width: 768px) calc(100vw - 2.5rem), 720px"
                className="cover-img"
                unoptimized={shouldBypassNextImageOptimizer(cover)}
              />
            )}
          </div>
        ) : null}

        <article className="notion-content">
          {content.length > 0 ? content : <p className="empty-note">暂无正文内容</p>}
        </article>

        <footer className="article-foot">
          <Link href="/blog" className="back-link">
            <span aria-hidden="true">←</span> Blog
          </Link>
        </footer>
      </main>

      <SiteFooter />
    </div>
  )
}
