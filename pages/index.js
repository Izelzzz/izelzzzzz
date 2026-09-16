import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { queryPublicDatabase } from '../lib/notion'

function formatDate(isoString) {
  if (!isoString) return 'UNKNOWN'
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return 'UNKNOWN'
  }
}

export async function getServerSideProps() {
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!process.env.NOTION_TOKEN || !databaseId) return { props: { transmissions: [] } }

  try {
    const { results } = await queryPublicDatabase(databaseId, {
      pageSize: 3,
      maxPages: 3,
    })
    const transmissions = results.map(post => ({
      id: post.id,
      title: post.properties['标题']?.title?.[0]?.plain_text || '未命名信号',
      description: post.properties.Description?.rich_text?.[0]?.plain_text || '',
      createdTime: post.created_time || null,
      tags: (post.properties['Tag']?.multi_select || []).map(tag => tag.name).slice(0, 3),
    }))
    return { props: { transmissions } }
  } catch {
    return { props: { transmissions: [] } }
  }
}

export default function Home({ transmissions }) {
  const heroVideoRef = useRef(null)

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return undefined

    const setPlaybackSpeed = () => {
      video.playbackRate = 0.3
    }

    const startVideo = () => {
      setPlaybackSpeed()
      video.load()
      video.play().catch(() => {})
    }
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(startVideo, { timeout: 1800 })
      : window.setTimeout(startVideo, 1200)

    video.addEventListener('loadedmetadata', setPlaybackSpeed)
    return () => {
      video.removeEventListener('loadedmetadata', setPlaybackSpeed)
      if (window.cancelIdleCallback && typeof idleId === 'number') window.cancelIdleCallback(idleId)
      else window.clearTimeout(idleId)
    }
  }, [])

  return (
    <div className="synapse-home">
      <Head>
        <title>IZEL / SYNAPSE ARCHIVE</title>
        <meta
          name="description"
          content="你正在窥看一个神秘碳基生物的精神世界。"
        />
      </Head>

      <header className="synapse-nav">
        <Link href="/" className="synapse-brand" aria-label="碳基生物 Izel 首页">
          <span className="synapse-brand-mark" aria-hidden="true" />
          <span>IZEL / SYNAPSE</span>
        </Link>
        <nav className="synapse-status" aria-label="主要导航">
          <Link href="/blog">文章</Link>
          <a href="#timeline">时间线</a>
          <a href="#interests">兴趣</a>
          <a href="#contact">联系我</a>
        </nav>
      </header>

      <main>
        <section className="synapse-hero" aria-labelledby="synapse-title">
          <video
            ref={heroVideoRef}
            className="synapse-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          >
            <source src="/videos/synapse-hero.mp4" type="video/mp4" />
          </video>
          <div className="synapse-hero-shade" aria-hidden="true" />
          <div className="synapse-hero-copy">
            <h1 id="synapse-title">
              你正在窥看
              <span>一个神秘碳基生物</span>
              的精神世界
            </h1>
            <p className="synapse-subtitle">每一次靠近，都会建立一条新的突触连接。</p>
          </div>
          <div className="synapse-menu-wrap">
            <p className="synapse-menu-label">SELECT A PATH / 选择入口</p>
            <nav className="synapse-menu" aria-label="精神世界入口">
              <Link
                href="/blog"
                className="synapse-menu-item"
              >
                <span className="synapse-menu-index">01</span>
                <span className="synapse-menu-text"><strong>文章档案</strong><small>THOUGHTS / NOTES / SIGNALS</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↗</span>
              </Link>
              <a
                href="#about"
                className="synapse-menu-item"
              >
                <span className="synapse-menu-index">02</span>
                <span className="synapse-menu-text"><strong>关于我</strong><small>IDENTITY / MEMORY / BIASES</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↓</span>
              </a>
              <a
                href="#contact"
                className="synapse-menu-item"
              >
                <span className="synapse-menu-index">03</span>
                <span className="synapse-menu-text"><strong>现实连接</strong><small>CONTACT / SOCIAL / OFFLINE</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↓</span>
              </a>
            </nav>
          </div>
          <div className="synapse-scroll" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
        </section>

        <section id="timeline" className="synapse-transmissions" aria-labelledby="transmission-title">
          <div id="about" className="synapse-section-head"><div><p>RECENT TRANSMISSIONS</p><h2 id="transmission-title">最新意识切片</h2></div><Link href="/blog">查看全部 <span aria-hidden="true">↗</span></Link></div>
          <div className="synapse-signal-list">
            {transmissions.length > 0 ? transmissions.map((post, index) => (
              <Link href={`/blog/${post.id}`} className="synapse-signal-row" key={post.id}><span className="synapse-signal-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{post.title}</h3>{post.description ? <p>{post.description}</p> : null}</div><time dateTime={post.createdTime || undefined}>{formatDate(post.createdTime)}</time><span aria-hidden="true">↗</span></Link>
            )) : <Link href="/blog" className="synapse-signal-empty">信号仍在同步，进入完整文章档案 <span aria-hidden="true">→</span></Link>}
          </div>
        </section>
      </main>

      <footer id="contact" className="synapse-footer">
        <span>IZEL / CARBON-BASED ARCHIVE</span><span>END OF CURRENT TRANSMISSION</span>
      </footer>
    </div>
  )
}
