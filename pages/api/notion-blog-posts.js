import { queryPublicDatabase } from '../../lib/notion'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  if (!process.env.NOTION_TOKEN) return res.status(500).json({ error: 'NOTION_TOKEN 未配置' })
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!databaseId) return res.status(500).json({ error: 'NOTION_DATABASE_ID 未配置' })

  try {
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor.length > 0 ? req.query.cursor : undefined
    const { results, nextCursor, hasMore } = await queryPublicDatabase(databaseId, {
      pageSize: 12,
      startCursor: cursor,
      maxPages: 2,
    })

    return res.status(200).json({ posts: results, nextCursor, hasMore })
  } catch (e) {
    return res.status(500).json({
      error: e?.message ? String(e.message).slice(0, 160) : 'Unknown error',
    })
  }
}
