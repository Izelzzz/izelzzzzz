import { Client } from '@notionhq/client'

const notionToken = process.env.NOTION_TOKEN
export const notion = notionToken ? new Client({ auth: notionToken }) : null

function isPrivatePostItem(post) {
  return (post?.properties?.['Tag']?.multi_select || []).some(t => {
    const name = String(t?.name ?? '').trim()
    return name === '私密'
  })
}

export async function queryDatabasePage(databaseId, { pageSize = 30, startCursor } = {}) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  if (!databaseId) throw new Error('NOTION_DATABASE_ID 未配置')

  const res = await notion.databases.query({
    database_id: databaseId,
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

async function getChildrenBlocks(blockId) {
  if (!notion) throw new Error('NOTION_TOKEN 未配置')
  const blocks = []
  let cursor = undefined
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

export async function getBlockTree(blockId) {
  const blocks = await getChildrenBlocks(blockId)
  const out = []
  for (const block of blocks) {
    const children = block.has_children ? await getBlockTree(block.id) : []
    out.push({ ...block, children })
  }
  return out
}
