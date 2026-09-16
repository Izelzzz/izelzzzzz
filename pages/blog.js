import Head from 'next/head'
import { makeCoverDataUri } from '../lib/cover'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

function ListCover({ src, title, priority = false }) {
  const isRemote = /^https?:\/\//i.test(src)
  if (!isRemote) {
    return <img src={src} alt={`${title} 封面`} loading={priority ? 'eager' : 'lazy'} decoding="async" className="w-full h-full object-cover" />
  }

  return (
    <Image
      src={src}
      alt={`${title} 封面`}
      fill
      sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1100px) 50vw, 512px"
      quality={45}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      className="object-cover"
    />
  )
}

export async function getStaticProps() {
  const configured = Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID)
  const error = configured ? null : 'Notion 未配置：请设置 NOTION_TOKEN 与 NOTION_DATABASE_ID'
  return {
    // Never block the first HTML response on the Notion API.
    props: { posts: [], error, configured, initialNextCursor: null, initialHasMore: false },
  }
}

export default function Blog({ posts: initialPosts, error, configured, initialNextCursor, initialHasMore }) {
  const [posts, setPosts] = useState(initialPosts || [])
  const [nextCursor, setNextCursor] = useState(initialNextCursor || null)
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore))
  const [loadingInitial, setLoadingInitial] = useState(Boolean(configured && !initialPosts?.length))
  const [pageError, setPageError] = useState(error)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(null)
  const sentinelRef = useRef(null)

  const allTags = useMemo(() => {
    const tagSet = new Set()
    posts.forEach(post => {
      (post.properties['Tag']?.multi_select || []).forEach(t => tagSet.add(t.name))
    })
    return Array.from(tagSet)
  }, [posts])

  const [selectedTag, setSelectedTag] = useState('全部')

  useEffect(() => {
    if (!configured || initialPosts?.length) return undefined
    const controller = new AbortController()
    fetch('/api/notion-blog-posts', { signal: controller.signal })
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return resp.json()
      })
      .then(data => {
        setPosts(Array.isArray(data.posts) ? data.posts : [])
        setNextCursor(data.nextCursor || null)
        setHasMore(Boolean(data.hasMore))
      })
      .catch(e => {
        if (e.name !== 'AbortError') setPageError(e?.message ? `Notion 请求失败：${String(e.message).slice(0, 160)}` : 'Notion 请求失败')
      })
      .finally(() => setLoadingInitial(false))
    return () => controller.abort()
  }, [configured, initialPosts])

  const filteredPosts = useMemo(() => {
    if (selectedTag === '全部') return posts
    return posts.filter(post =>
      (post.properties['Tag']?.multi_select || []).some(t => t.name === selectedTag)
    )
  }, [posts, selectedTag])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    if (!hasMore) return
    if (!configured) return

    setLoadingMore(true)
    setLoadMoreError(null)

    try {
      const cursorParam = nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ''
      const resp = await fetch(`/api/notion-blog-posts${cursorParam}`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const newPosts = Array.isArray(data.posts) ? data.posts : []

      setPosts(prev => {
        const seen = new Set(prev.map(p => p.id))
        const merged = [...prev]
        for (const p of newPosts) {
          if (!seen.has(p.id)) merged.push(p)
        }
        return merged
      })

      setNextCursor(data.nextCursor || null)
      setHasMore(Boolean(data.hasMore))
    } catch (e) {
      setLoadMoreError(e?.message ? String(e.message).slice(0, 160) : '加载更多失败')
    } finally {
      setLoadingMore(false)
    }
  }, [configured, hasMore, loadingMore, nextCursor])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!configured) return
    if (!hasMore) return

    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [configured, hasMore, loadMore])

  return (
    <div className="min-h-screen bg-primary text-accent">
      <Head>
        <title>碳基生物Izel狂想曲 - 博客</title>
      </Head>
      <header className="sticky top-0 z-30 bg-primary/80 backdrop-blur border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg hover:opacity-90">
            碳基生物Izel狂想曲
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-mosaic hover:text-accent transition">
              首页
            </Link>
            <Link href="/blog" className="text-mosaic hover:text-accent transition">
              文章
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">文章列表</h1>
            <p className="mt-2 text-mosaic text-sm">
              选择标签后即可筛选。正文排版采用更适合阅读的极简风格。
            </p>
          </div>
          <Link href="/" className="text-sm text-mosaic hover:text-accent transition">
            返回首页
          </Link>
        </div>

        {/* 标签 Tab */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className={
              selectedTag === '全部'
                ? 'px-4 py-2 rounded-full bg-accent text-primary'
                : 'px-4 py-2 rounded-full bg-white text-accent border border-black/10 hover:bg-black/5 transition'
            }
            onClick={() => setSelectedTag('全部')}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              type="button"
              key={tag}
              className={
                selectedTag === tag
                  ? 'px-4 py-2 rounded-full bg-accent text-primary'
                  : 'px-4 py-2 rounded-full bg-white text-accent border border-black/10 hover:bg-black/5 transition'
              }
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {pageError && (
            <div className="tile p-5">
              <div className="text-sm font-semibold">数据未加载</div>
              <div className="text-sm text-mosaic mt-2 break-words">{pageError}</div>
            </div>
          )}

          {!pageError && loadingInitial && (
            <div className="tile p-5 text-sm text-mosaic" aria-live="polite">
              正在同步文章…
            </div>
          )}

          {!pageError && !loadingInitial && filteredPosts.length === 0 && !loadingMore && !hasMore && (
            <div className="tile p-5">
              {configured
                ? '数据库暂无文章（请确认数据库里至少有 1 条记录）'
                : 'Notion 未配置：请设置 NOTION_TOKEN 与 NOTION_DATABASE_ID'}
            </div>
          )}

          {filteredPosts.map((post, postIndex) => {
            const title = post.properties['标题']?.title?.[0]?.plain_text || '未命名'
            const tags = post.properties['Tag']?.multi_select?.map(t => t.name).join(', ') || ''
            const desc = post.properties.Description?.rich_text?.[0]?.plain_text || ''
            const notionCover =
              post?.cover?.type === 'external'
                ? post?.cover?.external?.url
                : post?.cover?.type === 'file'
                  ? post?.cover?.file?.url
                  : post?.cover?.external?.url || post?.cover?.file?.url
            const cover = notionCover || makeCoverDataUri(title)
            return (
              <div key={post.id} className="tile p-5">
                <Link href={`/blog/${post.id}`} className="group">
                  <div className="relative w-full aspect-[16/9] overflow-hidden mb-4 bg-white">
                    <ListCover src={cover} title={title} />
                  </div>
                  <h2 className="text-lg font-semibold cursor-pointer group-hover:underline">
                    {title}
                  </h2>
                  {tags && <div className="text-xs text-mosaic mt-2">{tags}</div>}
                  {desc && (
                    <div
                      className="text-sm text-mosaic mt-3"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {desc}
                    </div>
                  )}
                </Link>
              </div>
            )
          })}
        </div>

        {loadMoreError && !pageError && (
          <div className="mt-6 tile p-4 text-sm text-mosaic break-words">
            加载更多失败：{loadMoreError}
          </div>
        )}

        {loadingMore && (
          <div className="mt-6 tile p-4 text-sm text-mosaic">
            加载中…
          </div>
        )}

        <div ref={sentinelRef} className="h-6" />
      </main>

      <footer className="py-10 text-center text-sm text-mosaic border-t border-black/5">
        Powered by Notion API
      </footer>
    </div>
  )
}
