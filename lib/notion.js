import { Client } from '@notionhq/client'

const notionToken = process.env.NOTION_TOKEN
export const notion = notionToken ? new Client({
  auth: notionToken,
  // Cloudflare Worker 提供 WorkerGlobalScope，需要允许这个服务器环境。
  dangerouslyAllowBrowser: typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers',
}) : null

function isPrivatePostItem(post) {
  return (post?.properties?.['Tag']?.multi_select || []).some(t => {
    const name = String(t?.name ?? '').trim()
    return name === '私密'
  })
}

export async function queryDatabasePage(databaseId, { pageSize = 30, startCursor } = {}) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  if (!databaseId) throw new Error('NOTION_DATABASE_ID 未配置')

  const database = await notion.databases.retrieve({ database_id: databaseId })
  if (database.data_sources?.length !== 1) {
    throw new Error('博客数据库需要包含一个 data source')
  }

  const res = await notion.dataSources.query({
    data_source_id: database.data_sources[0].id,
    result_type: 'page',
    page_size: pageSize,
    start_cursor: startCursor || undefined,
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  })

  return {
    results: res.results || [],
    nextCursor: res.has_more ? res.next_cursor : null,
    hasMore: Boolean(res.has_more),
  }
}

export async function queryPublicDatabase(databaseId, { pageSize = 30, startCursor, maxPages = 5 } = {}) {
  // 私密文章在服务器端直接过滤，避免任何方式拿到详情内容
  const acc = []
  let cursor = startCursor || undefined
  let remainingPages = maxPages
  let lastNextCursor = null
  let hasMore = true

  while (acc.length < pageSize && remainingPages > 0 && hasMore) {
    remainingPages -= 1

    const { results, nextCursor, hasMore: pageHasMore } = await queryDatabasePage(databaseId, {
      pageSize,
      startCursor: cursor,
    })
    lastNextCursor = nextCursor
    hasMore = pageHasMore

    for (const item of results) {
      if (!isPrivatePostItem(item)) acc.push(item)
      if (acc.length >= pageSize) break
    }

    cursor = nextCursor || undefined
  }

  return {
    results: acc,
    nextCursor: hasMore ? lastNextCursor : null,
    hasMore,
  }
}

export async function getDatabase(databaseId) {
  const { results } = await queryPublicDatabase(databaseId, { pageSize: 100, startCursor: undefined, maxPages: 1 })
  return results
}

export async function getPage(pageId) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  return await notion.pages.retrieve({ page_id: pageId })
}

export function isPrivatePage(page) {
  return isPrivatePostItem(page)
}

function normalizeNotionId(id) {
  return String(id || '').replaceAll('-', '').toLowerCase()
}

export function isPageInDatabase(page, databaseId) {
  const parentId = page?.parent?.database_id
  return Boolean(parentId && databaseId && normalizeNotionId(parentId) === normalizeNotionId(databaseId))
}

async function getChildrenBlocks(blockId, state) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  const blocks = []
  let cursor = undefined
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })
    state.count += res.results.length
    if (state.count > state.maxBlocks) throw new Error('文章内容超过可读取上限')
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

export async function getBlockTree(blockId, { maxDepth = 8, maxBlocks = 1000 } = {}) {
  const state = { count: 0, maxBlocks }
  async function visit(currentId, depth) {
    if (depth > maxDepth) throw new Error('文章嵌套层级超过可读取上限')
    const blocks = await getChildrenBlocks(currentId, state)
    const out = []
    for (const block of blocks) {
      const children = block.has_children ? await visit(block.id, depth + 1) : []
      out.push({ ...block, children })
    }
    return out
  }

  return visit(blockId, 0)
}

export async function getPublicPageData(pageId, databaseId = process.env.NOTION_DATABASE_ID) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  if (!databaseId) throw new Error('NOTION_DATABASE_ID 未配置')
  const page = await getPage(pageId)
  if (isPrivatePage(page) || !isPageInDatabase(page, databaseId)) return null
  const blocks = await getBlockTree(pageId)
  return { page, blocks }
}
