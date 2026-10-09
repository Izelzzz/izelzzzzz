import Head from 'next/head'
import { makeCoverDataUri, optimizeListCoverUrl, shouldBypassNextImageOptimizer } from '../lib/cover'
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { queryPublicDatabase } from '../lib/notion'

/** First row on ≥1100px (3-col); enough for LCP without starving the rest. */
const LIST_COVER_PRIORITY_COUNT = 3

/** Match archive-list breakpoints in styles/globals.css. */
const LIST_COVER_SIZES =
  '(max-width: 768px) calc(100vw - 2rem), (max-width: 1100px) calc(50vw - 2.5rem), 340px'

const ListCover = memo(function ListCover({ src, title, priority = false }) {
  const isRemote = /^https?:\/\//i.test(src)
  if (!isRemote) {
    return (
      <img
        src={src}
        alt={`${title} 封面`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="w-full h-full object-cover"
      />
    )
  }

  // Bypass `/_next/image` on Cloudflare OpenNext: it currently returns full
  // origin bytes. Prefer CDN-resized URLs from optimizeListCoverUrl instead.
  return (
    <Image
      src={src}
      alt={`${title} 封面`}
      fill
      sizes={LIST_COVER_SIZES}
      quality={45}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      unoptimized={shouldBypassNextImageOptimizer(src)}
      className="object-cover"
    />
  )
})

function resolveNotionCoverUrl(post) {
  if (post?.cover?.type === 'external') return post?.cover?.external?.url
  if (post?.cover?.type === 'file') return post?.cover?.file?.url
  return post?.cover?.external?.url || post?.cover?.file?.url
}

/** Precompute list display fields once per posts change (avoid SVG / URL work on tag click). */
function buildListCard(post) {
  const title = post.properties['标题']?.title?.[0]?.plain_text || '未命名'
  const tagNames = (post.properties['Tag']?.multi_select || []).map(t => t.name)
  const tagsLabel = tagNames.join(', ')
  const notionCover = resolveNotionCoverUrl(post)
  const cover = notionCover
    ? optimizeListCoverUrl(notionCover, { width: 720, quality: 55 })
    : makeCoverDataUri(title)
  return { id: post.id, title, tagNames, tagsLabel, cover }
}

const ArchiveCard = memo(function ArchiveCard({ card, priority }) {
  return (
    <div className="archive-card">
      <Link href={`/blog/${card.id}`} className="group">
        <div className="archive-card-cover relative w-full aspect-[16/9] overflow-hidden mb-4 bg-primary/30">
          <ListCover src={card.cover} title={card.title} priority={priority} />
        </div>
        <h2 className="archive-card-title text-lg font-semibold">{card.title}</h2>
        {card.tagsLabel ? (
          <div className="archive-card-tags text-xs text-mosaic mt-3">{card.tagsLabel}</div>
        ) : null}
      </Link>
    </div>
  )
})

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
  const serverResultReady = Array.isArray(initialPosts) && error == null
  const [loadingInitial, setLoadingInitial] = useState(!serverResultReady)
  const [pageError, setPageError] = useState(error)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(null)
  const sentinelRef = useRef(null)
  const [selectedTag, setSelectedTag] = useState('全部')

  const listCards = useMemo(() => (posts || []).map(buildListCard), [posts])

  const allTags = useMemo(() => {
    const tagSet = new Set()
    for (const card of listCards) {
      for (const name of card.tagNames) tagSet.add(name)
    }
    return Array.from(tagSet)
  }, [listCards])

  const postsByTag = useMemo(() => {
    const map = new Map()
    for (const card of listCards) {
      for (const name of card.tagNames) {
        let bucket = map.get(name)
        if (!bucket) {
          bucket = []
          map.set(name, bucket)
        }
        bucket.push(card)
      }
    }
    return map
  }, [listCards])

  useEffect(() => {
    if (!router.isReady) return
    const queryTag = typeof router.query.tag === 'string' ? router.query.tag : ''
    const next = queryTag || '全部'
    setSelectedTag(prev => (prev === next ? prev : next))
  }, [router.isReady, router.query.tag])

  const selectTag = useCallback(
    tag => {
      // Paint filter UI first; keep shallow URL sync off the pointer critical path.
      startTransition(() => {
        setSelectedTag(tag)
      })
      const query = tag === '全部' ? {} : { tag }
      queueMicrotask(() => {
        router.replace({ pathname: '/blog', query }, undefined, { shallow: true, scroll: false })
      })
    },
    [router]
  )

  useEffect(() => {
    // Server already returned a result (including legitimately empty): do not spin / re-fetch.
    if (Array.isArray(initialPosts) && error == null) return undefined
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
        if (e.name !== 'AbortError') {
          setPageError(e?.message ? `Notion 请求失败：${String(e.message).slice(0, 160)}` : 'Notion 请求失败')
        }
      })
      .finally(() => setLoadingInitial(false))
    return () => controller.abort()
  }, [initialPosts, error])

  const filteredCards = useMemo(() => {
    if (selectedTag === '全部') return listCards
    return postsByTag.get(selectedTag) || []
  }, [listCards, postsByTag, selectedTag])

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
        <div className="archive-nav-inner mx-auto px-4 py-3 flex items-center justify-between">
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

      <main className="archive-main flex-1 mx-auto px-4 py-12">
        <div>
          <h1 className="archive-title text-3xl font-semibold tracking-tight">文章列表</h1>
        </div>

        {/* 标签 Tab */}
        <div className="archive-filters mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className={
              selectedTag === '全部' ? 'archive-filter archive-filter-active' : 'archive-filter'
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
                selectedTag === tag ? 'archive-filter archive-filter-active' : 'archive-filter'
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

          {!pageError && !loadingInitial && filteredCards.length === 0 && !loadingMore && !hasMore && (
            <div className="archive-status tile p-5">
              数据库暂无文章（请确认数据库里至少有 1 条记录）
            </div>
          )}

          {filteredCards.map((card, index) => (
            <ArchiveCard
              key={card.id}
              card={card}
              priority={index < LIST_COVER_PRIORITY_COUNT}
            />
          ))}
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
