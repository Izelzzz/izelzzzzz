import { getPublicPageData, notion } from '../../lib/notion'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  const pageId = typeof req.query.id === 'string' ? req.query.id : ''
  if (!pageId) return res.status(400).json({ error: '缺少文章 ID' })
  if (!notion) return res.status(500).json({ error: 'NOTION_TOKEN 未配置' })

  try {
    const result = await getPublicPageData(pageId)
    if (!result) return res.status(404).json({ error: '文章不存在' })
    return res.status(200).json(result)
  } catch (e) {
    if (e?.status === 404 || e?.code === 'object_not_found') {
      return res.status(404).json({ error: '文章不存在' })
    }
    return res.status(500).json({
      error: e?.message ? String(e.message).slice(0, 160) : '文章读取失败',
    })
  }
}
