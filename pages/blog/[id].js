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

function extractHrefFromRichTextItem(t) {
  const direct = t?.href
  if (direct) return direct

  // Notion rich_text 的部分链接会在这里
  const url = t?.text?.link?.url
  if (url) return url

  // 兜底：如果 plain_text 本身就是 URL
  const plain = t?.plain_text
  if (plain && isHttpUrl(String(plain).trim())) return String(plain).trim()

  return null
}

function renderRichText(richText) {
  const list = Array.isArray(richText) ? richText : []
  return list.map((t, i) => {
    const text = t?.plain_text ?? ''
    const href = extractHrefFromRichTextItem(t)
    if (href && isHttpUrl(href)) {
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="underline decoration-black/20 hover:decoration-black/60"
        >
          {text || href}
        </a>
      )
    }
    return <span key={i}>{text}</span>
  })
}

function LinkCard({ href }) {
  const domain = getDomain(href)
  return (
    <div className="mt-4 tile p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-accent">{domain}</div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="text-xs text-mosaic underline decoration-black/10 hover:decoration-black/30 break-all"
        >
          {href}
        </a>
      </div>
      <div className="mt-3 text-sm">
        <div className="text-xs text-mosaic mb-2">预览（可能因网站限制无法显示）</div>
        <iframe
          src={href}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="w-full rounded-lg border border-black/10 bg-white"
          style={{ height: 360 }}
        />
      </div>
    </div>
  )
}

// 获取所有 blocks
async function getPageBlocks(pageId) {
  const blocks = []
  let cursor = undefined
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
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
    blocks = await getPageBlocks(id)
  } catch (e) {
    error = e?.message ? String(e.message).slice(0, 160) : '页面不存在或 API 异常'
  }
  return { props: { page, blocks, error } }
}

function renderBlock(block) {
  const { type, id } = block
  const value = block[type]
  switch (type) {
    case 'bookmark': {
      const url =
        value?.url ||
        value?.bookmark?.url ||
        value?.link?.url ||
        value?.source?.url ||
        value?.source
      const urlString = typeof url === 'string' ? url : null
      if (urlString && isHttpUrl(urlString)) {
        return (
          <div key={id}>
            <LinkCard href={urlString} />
          </div>
        )
      }
      return null
    }
    case 'link_preview': {
      const url =
        value?.url ||
        value?.link?.url ||
        value?.source?.url ||
        value?.source
      const urlString = typeof url === 'string' ? url : null
      if (urlString && isHttpUrl(urlString)) {
        return (
          <div key={id}>
            <LinkCard href={urlString} />
          </div>
        )
      }
      return null
    }
    case 'embed': {
      const url = value?.url || value?.source?.url || value?.source
      const urlString = typeof url === 'string' ? url : null
      if (urlString && isHttpUrl(urlString)) {
        return (
          <div key={id}>
            <LinkCard href={urlString} />
          </div>
        )
      }
      return null
    }
    case 'paragraph':
      // 段落里如果包含链接，除了“文字可点击”，还会额外渲染一个链接卡片（可展开 iframe 预览）
      {
        const rich = Array.isArray(value?.rich_text) ? value.rich_text : []
        const hrefs = Array.from(
          new Set(
            rich
              .map(t => extractHrefFromRichTextItem(t))
              .filter(h => h && isHttpUrl(h))
          )
        ).slice(0, 1)
        const firstHref = hrefs[0]
        return (
          <div key={id}>
            <p className="text-mosaic">{renderRichText(rich)}</p>
            {firstHref ? <LinkCard href={firstHref} /> : null}
          </div>
        )
      }
    case 'heading_1':
      return (
        <h2 key={id} className="text-2xl font-semibold">
          {renderRichText(value.rich_text)}
        </h2>
      )
    case 'heading_2':
      return (
        <h3 key={id} className="text-xl font-semibold">
          {renderRichText(value.rich_text)}
        </h3>
      )
    case 'heading_3':
      return (
        <h4 key={id} className="text-lg font-semibold">
          {renderRichText(value.rich_text)}
        </h4>
      )
    case 'bulleted_list_item':
      return (
        <li key={id} className="text-mosaic">
          {renderRichText(value.rich_text)}
        </li>
      )
    case 'numbered_list_item':
      return (
        <li key={id} className="text-mosaic">
          {renderRichText(value.rich_text)}
        </li>
      )
    default:
      return null // 其他类型暂不渲染
  }
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
  // 分组渲染列表
  let listType = null, listBuffer = []
  const content = []
  blocks.forEach((block, idx) => {
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      if (!listType) listType = block.type
      if (block.type === listType) {
        listBuffer.push(block)
      } else {
        // 渲染上一个列表
        const ListWrapper = listType === 'numbered_list_item' ? 'ol' : 'ul'
        const listClass = listType === 'numbered_list_item' ? 'list-decimal' : 'list-disc'
        content.push(
          <ListWrapper key={idx + '-list'} className={listClass}>
            {listBuffer.map(renderBlock)}
          </ListWrapper>
        )
        listBuffer = [block]
        listType = block.type
      }
    } else {
      if (listBuffer.length > 0) {
        const ListWrapper = listType === 'numbered_list_item' ? 'ol' : 'ul'
        const listClass = listType === 'numbered_list_item' ? 'list-decimal' : 'list-disc'
        content.push(
          <ListWrapper key={idx + '-list'} className={listClass}>
            {listBuffer.map(renderBlock)}
          </ListWrapper>
        )
        listBuffer = []
        listType = null
      }
      content.push(renderBlock(block))
    }
  })
  if (listBuffer.length > 0) {
    const ListWrapper = listType === 'numbered_list_item' ? 'ol' : 'ul'
    const listClass = listType === 'numbered_list_item' ? 'list-decimal' : 'list-disc'
    content.push(
      <ListWrapper key={'last-list'} className={listClass}>
        {listBuffer.map(renderBlock)}
      </ListWrapper>
    )
  }
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
