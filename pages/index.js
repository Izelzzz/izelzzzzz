import Head from 'next/head'
import Link from 'next/link'
import MindscapeCanvas from '../components/MindscapeCanvas'
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
  return (
    <div className="mind-home">
      <Head>
        <title>碳基生物 Izel | 精神观测站</title>
        <meta
          name="description"
          content="进入碳基生物 Izel 的精神观测站，读取关于产品、技术与生活的意识切片。"
        />
      </Head>

      <header className="mind-nav">
        <Link href="/" className="mind-brand" aria-label="碳基生物 Izel 首页">
          <span className="mind-brand-mark" aria-hidden="true" />
          <span>IZEL / MIND</span>
        </Link>
        <nav aria-label="主要导航">
          <Link href="/blog" className="mind-nav-link">
            文章档案 <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <main>
        <section className="mind-hero" aria-labelledby="mind-title">
          <MindscapeCanvas />
          <div className="mind-coordinate mind-coordinate-top" aria-hidden="true">
            OBSERVATION NODE 22.3193° N / 114.1694° E
          </div>
          <div className="mind-hero-inner">
            <div className="mind-kicker">
              <span className="mind-live-dot" aria-hidden="true" />
              意识链路已建立
            </div>
            <h1 id="mind-title">
              碳基生物
              <span>IZEL</span>
            </h1>
            <p className="mind-thesis">
              你正在窥看一个神秘碳基生物的精神世界。
              <br />
              思考、偏见与未完成的念头正在实时显影。
            </p>
            <Link href="/blog" className="mind-enter">
              <span>进入精神世界</span>
              <span className="mind-enter-arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mind-telemetry" aria-hidden="true">
            <span>SPECIMEN / CB-I72</span>
            <span>COGNITIVE SIGNAL / ACTIVE</span>
            <span>NOISE RATIO / 08.4%</span>
          </div>
          <div className="mind-scroll-cue" aria-hidden="true">
            <span>向下读取</span>
            <i />
          </div>
        </section>

        <section className="mind-transmissions" aria-labelledby="transmission-title">
          <div className="mind-section-head">
            <div>
              <p>RECENT TRANSMISSIONS / 最近捕获</p>
              <h2 id="transmission-title">意识切片</h2>
            </div>
            <Link href="/blog">查看全部档案 <span aria-hidden="true">→</span></Link>
          </div>

          <div className="mind-signal-list">
            {transmissions.length > 0 ? (
              transmissions.map((post, index) => (
                <Link href={`/blog/${post.id}`} className="mind-signal-row" key={post.id}>
                  <span className="mind-signal-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="mind-signal-main">
                    <h3>{post.title}</h3>
                    {post.description ? <p>{post.description}</p> : null}
                  </div>
                  <div className="mind-signal-meta">
                    <time dateTime={post.createdTime || undefined}>{formatDate(post.createdTime)}</time>
                    {post.tags.length ? <span>{post.tags.join(' / ')}</span> : null}
                  </div>
                  <span className="mind-signal-arrow" aria-hidden="true">↗</span>
                </Link>
              ))
            ) : (
              <Link href="/blog" className="mind-signal-empty">
                信号仍在同步，进入完整文章档案 <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="mind-footer">
        <span>IZEL / CARBON-BASED ARCHIVE</span>
        <span>END OF CURRENT TRANSMISSION</span>
      </footer>
    </div>
  )
}
