import { queryPublicDatabase } from '../../lib/notion'

/** Short CDN/browser TTL for successful list responses (load-more / legacy clients). */
const LIST_CACHE_CONTROL = 'public, s-maxage=120, stale-while-revalidate=60'

function setNoStore(res) {
  res.setHeader('Cache-Control', 'private, no-store')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    setNoStore(res)
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!process.env.NOTION_TOKEN) {
    setNoStore(res)
    return res.status(500).json({ error: 'NOTION_TOKEN 未配置' })
  }
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!databaseId) {
    setNoStore(res)
    return res.status(500).json({ error: 'NOTION_DATABASE_ID 未配置' })
  }

  try {
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor.length > 0 ? req.query.cursor : undefined
    const { results, nextCursor, hasMore } = await queryPublicDatabase(databaseId, {
      pageSize: 12,
      startCursor: cursor,
      maxPages: 2,
    })

    // Cursor is part of the request URL, so CDN cache keys stay distinct per page.
    res.setHeader('Cache-Control', LIST_CACHE_CONTROL)
    return res.status(200).json({ posts: results, nextCursor, hasMore })
  } catch (e) {
    setNoStore(res)
    return res.status(500).json({
      error: e?.message ? String(e.message).slice(0, 160) : 'Unknown error',
    })
  }
}
