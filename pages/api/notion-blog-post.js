import { getBlockTree, getPage, isPrivatePage, notion } from '../../lib/notion'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  const pageId = typeof req.query.id === 'string' ? req.query.id : ''
  if (!pageId) return res.status(400).json({ error: '缺少文章 ID' })
  if (!notion) return res.status(500).json({ error: 'NOTION_TOKEN 未配置' })

  try {
    const page = await getPage(pageId)
    if (isPrivatePage(page)) return res.status(404).json({ error: '文章不存在' })
    const blocks = await getBlockTree(pageId)
    return res.status(200).json({ page, blocks })
  } catch (e) {
    return res.status(500).json({
      error: e?.message ? String(e.message).slice(0, 160) : '文章读取失败',
    })
  }
}
