import { Fragment } from 'react'
import { notion } from '../../lib/notion'
import Head from 'next/head'
import Link from 'next/link'
import { makeCoverDataUri } from '../../lib/cover'

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

function getDomain(url) {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
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
function renderRichText(richText) {
  const list = Array.isArray(richText) ? richText : []
  const out = []
  let outKey = 0

  list.forEach((t, i) => {
    const raw = t?.plain_text ?? ''
    const lines = raw.split('\n')
    const href = extractHrefFromRichTextItem(t)

    lines.forEach((line, li) => {
      if (li > 0) {
        out.push(<br key={`notion-br-${i}-${li}-${outKey++}`} />)
      }
      if (href && isHttpUrl(href)) {
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

function LinkCard({ href }) {
  const domain = getDomain(href)
  const label = href.replace(/^https?:\/\//, '')
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-4 block tile p-4 hover:translate-y-[-1px] focus:outline-none focus:ring-2 focus:ring-accent/30"
      aria-label={`打开 ${domain} 网页`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-accent break-all">{domain}</div>
          <div className="mt-1 text-xs text-mosaic break-all">{label}</div>
        </div>
        <div className="text-xs text-mosaic shrink-0">打开网页 ↗</div>
      </div>
    </a>
  )
}

// 获取所有 blocks
async function getChildrenBlocks(blockId) {
  const blocks = []
  let cursor = undefined
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

async function getBlockTree(blockId) {
  const blocks = await getChildrenBlocks(blockId)
  const out = []
  for (const block of blocks) {
    const children = block.has_children ? await getBlockTree(block.id) : []
    out.push({ ...block, children })
  }
  return out
}

function isPrivatePage(page) {
  return (page?.properties?.['Tag']?.multi_select || []).some(t => t?.name === '私密')
}

export async function getServerSideProps(context) {
  const { id } = context.params
  let page = null
  let blocks = []
  let error = null
  if (!notion) {
    return { props: { page, blocks, error: 'Notion 未配置：请设置 NOTION_TOKEN' } }
  }
  try {
    page = await notion.pages.retrieve({ page_id: id })
    // 私密文章：返回 404，并且不再请求 blocks，避免泄露内容
    if (isPrivatePage(page)) return { notFound: true }
    blocks = await getBlockTree(id)
  } catch (e) {
    error = e?.message ? String(e.message).slice(0, 160) : '页面不存在或 API 异常'
  }
  return { props: { page, blocks, error } }
}

function renderLinkCards(urls, keyPrefix) {
  if (!Array.isArray(urls) || urls.length === 0) return null
  return (
    <div className="space-y-4">
      {urls.map((href, index) => (
        <LinkCard key={`${keyPrefix}-link-${index}`} href={href} />
      ))}
    </div>
  )
}

function renderChildren(block) {
  if (!Array.isArray(block?.children) || block.children.length === 0) return null
  return <div className="mt-2">{renderBlocks(block.children)}</div>
}

function renderHeadingByType(type, id, rich, urls) {
  if (type === 'heading_1') {
    return (
      <div key={id} className="my-5">
        <h2 className="text-2xl font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h2>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  if (type === 'heading_2') {
    return (
      <div key={id} className="my-4">
        <h3 className="text-xl font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h3>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  if (type === 'heading_3') {
    return (
      <div key={id} className="my-3">
        <h4 className="text-lg font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h4>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  if (type === 'heading_4') {
    return (
      <div key={id} className="my-3">
        <h5 className="text-base font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h5>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  if (type === 'heading_5') {
    return (
      <div key={id} className="my-2">
        <h5 className="text-sm font-semibold uppercase tracking-wide whitespace-pre-wrap break-words">{renderRichText(rich)}</h5>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  if (type === 'heading_6') {
    return (
      <div key={id} className="my-2">
        <h6 className="text-sm font-semibold whitespace-pre-wrap break-words">{renderRichText(rich)}</h6>
        {renderLinkCards(urls, id)}
      </div>
    )
  }
  return null
}

function renderBlock(block) {
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
            <LinkCard href={urlString} />
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
            <LinkCard href={urlString} />
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
            <LinkCard href={urlString} />
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
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full max-h-[min(80vh,900px)] object-contain rounded-lg border border-black/10 bg-white"
          />
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
          {renderLinkCards(urls, id)}
        </div>
      )
    case 'quote':
      return (
        <blockquote key={id} className="my-4 border-l-4 border-black/15 bg-slate-50/80 px-4 py-3 rounded-r-lg">
          <div className="text-mosaic whitespace-pre-wrap break-words italic">{renderRichText(rich)}</div>
          {renderChildren(block)}
          {renderLinkCards(urls, id)}
        </blockquote>
      )
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4':
    case 'heading_5':
    case 'heading_6':
      return renderHeadingByType(type, id, rich, urls)
    case 'bulleted_list_item':
      return (
        <li key={id} className="text-mosaic whitespace-pre-wrap break-words">
          <div>{renderRichText(rich)}</div>
          {renderChildren(block)}
          {renderLinkCards(urls, id)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id} className="text-mosaic whitespace-pre-wrap break-words">
          <div>{renderRichText(rich)}</div>
          {renderChildren(block)}
          {renderLinkCards(urls, id)}
        </li>
      )
    default:
      return (
        <Fragment key={id}>
          {renderChildren(block)}
          {findUrl(block) && type !== 'paragraph' ? <LinkCard href={findUrl(block)} /> : null}
          {renderLinkCards(urls, id)}
        </Fragment>
      )
  }
}

function renderBlocks(blocks) {
  const content = []
  let listType = null
  let listBuffer = []

  const flushList = key => {
    if (listBuffer.length === 0) return
    const ListWrapper = listType === 'numbered_list_item' ? 'ol' : 'ul'
    const listClass = listType === 'numbered_list_item' ? 'list-decimal' : 'list-disc'
    content.push(
      <ListWrapper key={key} className={`${listClass} my-3`}>
        {listBuffer.map(renderBlock)}
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
      content.push(renderBlock(block))
    }
  })

  flushList('last-list')
  return content
}

export default function BlogDetail({ page, blocks, error }) {
  if (!page) {
    return (
      <div className="min-h-screen bg-primary text-accent flex flex-col items-center justify-center p-6">
        <div className="tile p-6 max-w-xl w-full">
          <h1 className="text-2xl font-semibold">文章不存在或获取失败</h1>
          {error && <div className="text-sm text-mosaic mt-2 break-words">{error}</div>}
          <div className="mt-5">
            <Link href="/blog" className="inline-flex px-4 py-2 rounded-xl bg-accent text-primary text-sm hover:opacity-95 transition">
              返回文章列表
            </Link>
          </div>
        </div>
      </div>
    )
  }
  const title = page.properties['标题']?.title[0]?.plain_text || '未命名'
  const notionCover =
    page?.cover?.type === 'external'
      ? page?.cover?.external?.url
      : page?.cover?.type === 'file'
        ? page?.cover?.file?.url
        : page?.cover?.external?.url || page?.cover?.file?.url
  const cover = notionCover || makeCoverDataUri(title)
  const tagList = page.properties['Tag']?.multi_select?.map(t => t.name) || []
  const desc = page.properties.Description?.rich_text[0]?.plain_text || ''
  const content = renderBlocks(blocks)
  return (
    <div className="min-h-screen bg-primary text-accent">
      <Head>
        <title>{title} - 碳基生物Izel狂想曲</title>
      </Head>

      <header className="sticky top-0 z-30 bg-primary/80 backdrop-blur border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg hover:opacity-90">
            碳基生物Izel狂想曲
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="text-mosaic hover:text-accent transition">
              文章
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/blog" className="text-sm text-mosaic hover:text-accent transition">
            ← 返回文章列表
          </Link>
          <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
            {title}
          </h1>
          {page?.created_time ? (
            <div className="mt-2 text-sm text-mosaic">
              创建于 {formatZhDate(page.created_time)}
            </div>
          ) : null}

          {tagList.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tagList.map(t => (
                <span
                  key={t}
                  className="text-xs px-2.5 py-1 rounded-full border border-black/10 bg-white/70 text-mosaic"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {desc && <p className="mt-5 text-mosaic text-lg leading-relaxed">{desc}</p>}
        </div>

        <div className="tile p-8">
          <article className="notion-content">
            <img
              src={cover}
              alt={`${title} 封面`}
              className="w-full aspect-[16/9] object-cover mb-6 bg-white"
              loading="eager"
            />
            {content.length > 0 ? content : <div className="text-mosaic">暂无正文内容</div>}
          </article>
        </div>
      </main>
    </div>
  )
}
