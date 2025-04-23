import Head from 'next/head'
import { getDatabase } from '../lib/notion'
import { useState } from 'react'
import Link from 'next/link'

const mosaicTips = [
  '点击文章标题可查看更多内容',
  '标签和分类功能即将上线',
  '像素世界，奇遇不断！',
  '勇敢探索，发现彩蛋！',
  '你是第' + (Math.floor(Math.random() * 1000) + 1) + '位访客',
]

export async function getServerSideProps() {
  const databaseId = process.env.NOTION_DATABASE_ID
  let posts = []
  try {
    posts = await getDatabase(databaseId)
  } catch (e) {
    // 如果未配置或出错，返回空列表
  }
  return { props: { posts } }
}

export default function Blog({ posts }) {
  const [tip, setTip] = useState('')
  // 统计所有标签
  const tagSet = new Set()
  posts.forEach(post => {
    (post.properties['Tag']?.multi_select || []).forEach(t => tagSet.add(t.name))
  })
  const allTags = Array.from(tagSet)
  const [selectedTag, setSelectedTag] = useState('全部')
  // 过滤文章
  const filteredPosts = selectedTag === '全部'
    ? posts
    : posts.filter(post => (post.properties['Tag']?.multi_select || []).some(t => t.name === selectedTag))

  return (
    <div className="relative min-h-screen bg-primary overflow-hidden">
      <Head>
        <title>碳基生物Izel狂想曲 - 博客</title>
      </Head>
      {/* Mosaic Pixel Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="w-full h-full grid grid-cols-12 grid-rows-7 gap-1 opacity-60">
          {Array.from({ length: 84 }).map((_, i) => (
            <div
              key={i}
              className="tile transition hover:scale-110 hover:bg-accent cursor-pointer pointer-events-auto"
              onClick={() => setTip(mosaicTips[Math.floor(Math.random() * mosaicTips.length)])}
              onMouseEnter={e => e.currentTarget.classList.add('ring-2','ring-accent')}
              onMouseLeave={e => e.currentTarget.classList.remove('ring-2','ring-accent')}
              style={{ minHeight: 36 }}
            >
              {i % 13 === 0 ? '🎲' : ''}
            </div>
          ))}
        </div>
      </div>
      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-pixel text-accent mb-2">Izel的文章列表</h1>
          <a href="/" className="text-mosaic underline">返回首页</a>
        </header>
        {/* 标签Tab栏 */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <button
            className={`px-4 py-2 rounded font-pixel shadow ${selectedTag === '全部' ? 'bg-accent text-primary' : 'bg-mosaic text-accent hover:bg-accent hover:text-primary transition'}`}
            onClick={() => setSelectedTag('全部')}
          >全部</button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`px-4 py-2 rounded font-pixel shadow ${selectedTag === tag ? 'bg-accent text-primary' : 'bg-mosaic text-accent hover:bg-accent hover:text-primary transition'}`}
              onClick={() => setSelectedTag(tag)}
            >{tag}</button>
          ))}
        </div>
        {tip && (
          <div className="font-pixel bg-mosaic text-primary px-4 py-2 rounded shadow mb-4 animate-bounce">{tip}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {filteredPosts.length === 0 && <div className="tile p-4">暂无文章或未正确配置 Notion Token/数据库ID</div>}
          {filteredPosts.map(post => (
            <div key={post.id} className="tile p-4 shadow-lg">
              <Link href={`/blog/${post.id}`}>
                <h2 className="font-pixel text-lg mb-2 cursor-pointer hover:underline">{post.properties['标题']?.title[0]?.plain_text || '未命名'}</h2>
              </Link>
              <div className="text-xs text-mosaic mb-1">{post.properties['Tag']?.multi_select.map(t => t.name).join(', ')}</div>
              <div className="mt-2 text-xs">{post.properties.Description?.rich_text[0]?.plain_text || ''}</div>
            </div>
          ))}
        </div>
      </main>
      <footer className="absolute bottom-2 left-0 right-0 text-center text-xs text-mosaic z-20">
        Powered by Notion API
      </footer>
    </div>
  )
}
