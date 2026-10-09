import Head from 'next/head'
import { makeCoverDataUri } from '../lib/cover'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { queryPublicDatabase } from '../lib/notion'

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
  // First page via ISR (same revalidate strategy as home). Load-more stays on the API.
  const empty = { posts: [], error: null, initialNextCursor: null, initialHasMore: false }
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!process.env.NOTION_TOKEN || !databaseId) {
    return { props: empty, revalidate: 3600 }
  }

  try {
    const { results, nextCursor, hasMore } = await queryPublicDatabase(databaseId, {
      pageSize: 12,
      maxPages: 2,
    })
    return {
      props: {
        posts: results,
        error: null,
        initialNextCursor: nextCursor || null,
        initialHasMore: Boolean(hasMore),
      },
      revalidate: 3600,
    }
  } catch (err) {
    console.error('Failed to fetch blog posts for ISR:', err)
    return {
      props: {
        ...empty,
        error: err?.message
          ? `Notion 请求失败：${String(err.message).slice(0, 160)}`
          : 'Notion 请求失败',
      },
      revalidate: 300,
    }
  }
}

export default function Blog({ posts: initialPosts, error, initialNextCursor, initialHasMore }) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts || [])
  const [nextCursor, setNextCursor] = useState(initialNextCursor || null)
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore))
  const [loadingInitial, setLoadingInitial] = useState(!initialPosts?.length)
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
    if (!router.isReady) return
    const queryTag = typeof router.query.tag === 'string' ? router.query.tag : ''
    setSelectedTag(queryTag || '全部')
  }, [router.isReady, router.query.tag])

  const selectTag = useCallback(
    tag => {
      setSelectedTag(tag)
      const query = tag === '全部' ? {} : { tag }
      router.replace({ pathname: '/blog', query }, undefined, { shallow: true, scroll: false })
    },
    [router]
  )

  useEffect(() => {
    if (initialPosts?.length) return undefined
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
  }, [initialPosts])

  const filteredPosts = useMemo(() => {
    if (selectedTag === '全部') return posts
    return posts.filter(post =>
      (post.properties['Tag']?.multi_select || []).some(t => t.name === selectedTag)
    )
  }, [posts, selectedTag])

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    if (!hasMore) return

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
  }, [hasMore, loadingMore, nextCursor])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    if (!hasMore) return

    const io = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, loadMore])

  return (
    <div className="archive-page flex min-h-screen flex-col bg-primary text-accent">
      <Head>
        <title>碳基生物Izel狂想曲 - 博客</title>
      </Head>
      <header className="archive-nav sticky top-0 z-30">
        <div className="archive-nav-inner max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="archive-brand font-semibold tracking-tight text-lg">
            碳基生物Izel狂想曲
          </Link>
          <nav className="archive-nav-links flex items-center gap-6 text-sm">
            <Link href="/" className="text-mosaic">
              首页
            </Link>
            <Link href="/blog" className="text-mosaic">
              文章
            </Link>
          </nav>
        </div>
      </header>

      <main className="archive-main flex-1 max-w-5xl mx-auto px-4 py-12">
        <div>
          <h1 className="archive-title text-3xl font-semibold tracking-tight">文章列表</h1>
        </div>

        {/* 标签 Tab */}
        <div className="archive-filters mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className={
              selectedTag === '全部'
                ? 'archive-filter archive-filter-active'
                : 'archive-filter'
            }
            onClick={() => selectTag('全部')}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              type="button"
              key={tag}
              className={
                selectedTag === tag
                  ? 'archive-filter archive-filter-active'
                  : 'archive-filter'
              }
              onClick={() => selectTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="archive-list mt-8">
          {pageError && (
            <div className="archive-status tile p-5">
              <div className="text-sm font-semibold">数据未加载</div>
              <div className="text-sm text-mosaic mt-2 break-words">{pageError}</div>
            </div>
          )}

          {!pageError && loadingInitial && (
            <div className="archive-loading text-sm text-mosaic" aria-live="polite">
              <span className="archive-spinner" aria-hidden="true" />
              <span>正在同步文章…</span>
            </div>
          )}

          {!pageError && !loadingInitial && filteredPosts.length === 0 && !loadingMore && !hasMore && (
            <div className="archive-status tile p-5">
              数据库暂无文章（请确认数据库里至少有 1 条记录）
            </div>
          )}

          {filteredPosts.map(post => {
            const title = post.properties['标题']?.title?.[0]?.plain_text || '未命名'
            const tags = post.properties['Tag']?.multi_select?.map(t => t.name).join(', ') || ''
            const notionCover =
              post?.cover?.type === 'external'
                ? post?.cover?.external?.url
                : post?.cover?.type === 'file'
                  ? post?.cover?.file?.url
                  : post?.cover?.external?.url || post?.cover?.file?.url
            const cover = notionCover || makeCoverDataUri(title)
            return (
              <div key={post.id} className="archive-card">
                <Link href={`/blog/${post.id}`} className="group">
                  <div className="archive-card-cover relative w-full aspect-[16/9] overflow-hidden mb-4 bg-white">
                    <ListCover src={cover} title={title} />
                  </div>
                  <h2 className="archive-card-title text-lg font-semibold">
                    {title}
                  </h2>
                  {tags && <div className="archive-card-tags text-xs text-mosaic mt-3">{tags}</div>}
                </Link>
              </div>
            )
          })}
        </div>

        {loadMoreError && !pageError && (
          <div className="archive-status mt-6 tile p-4 text-sm text-mosaic break-words">
            加载更多失败：{loadMoreError}
          </div>
        )}

        {loadingMore && (
          <div className="archive-loading mt-6 text-sm text-mosaic" aria-live="polite">
            <span className="archive-spinner" aria-hidden="true" />
            <span>加载中…</span>
          </div>
        )}

        <div ref={sentinelRef} className="h-6" />
      </main>

      <footer className="archive-footer py-10 text-center text-sm text-mosaic">
        Powered by Notion API
      </footer>
    </div>
  )
}
