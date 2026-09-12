import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import SynapseCanvas from '../components/SynapseCanvas'
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
  const [activeMenu, setActiveMenu] = useState(null)

  const activateMenu = menu => setActiveMenu(menu)

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
        <nav className="synapse-status" aria-label="观测状态">
          <span className="synapse-status-dot" />
          <span>NEURAL FIELD / ONLINE</span>
        </nav>
      </header>

      <main>
        <section className="synapse-hero" aria-labelledby="synapse-title">
          <SynapseCanvas activeMenu={activeMenu} />
          <div className="synapse-hero-grid" aria-hidden="true" />
          <div className="synapse-hero-copy">
            <p className="synapse-overline">PRIVATE COGNITIVE ARCHIVE / 001</p>
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
                data-synapse-target="archive"
                className={`synapse-menu-item ${activeMenu === 'archive' ? 'is-active' : ''}`}
                onMouseEnter={() => activateMenu('archive')}
                onMouseLeave={() => activateMenu(null)}
                onFocus={() => activateMenu('archive')}
                onBlur={() => activateMenu(null)}
              >
                <span className="synapse-menu-index">01</span>
                <span className="synapse-menu-text"><strong>文章档案</strong><small>THOUGHTS / NOTES / SIGNALS</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↗</span>
              </Link>
              <a
                href="#about"
                data-synapse-target="about"
                className={`synapse-menu-item ${activeMenu === 'about' ? 'is-active' : ''}`}
                onMouseEnter={() => activateMenu('about')}
                onMouseLeave={() => activateMenu(null)}
                onFocus={() => activateMenu('about')}
                onBlur={() => activateMenu(null)}
              >
                <span className="synapse-menu-index">02</span>
                <span className="synapse-menu-text"><strong>关于这个个体</strong><small>IDENTITY / MEMORY / BIASES</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↓</span>
              </a>
              <a
                href="#protocol"
                data-synapse-target="protocol"
                className={`synapse-menu-item ${activeMenu === 'protocol' ? 'is-active' : ''}`}
                onMouseEnter={() => activateMenu('protocol')}
                onMouseLeave={() => activateMenu(null)}
                onFocus={() => activateMenu('protocol')}
                onBlur={() => activateMenu(null)}
              >
                <span className="synapse-menu-index">03</span>
                <span className="synapse-menu-text"><strong>观测说明</strong><small>HOW TO READ THIS MIND</small></span>
                <span className="synapse-menu-arrow" aria-hidden="true">↓</span>
              </a>
            </nav>
          </div>
          <div className="synapse-corner synapse-corner-left" aria-hidden="true">LAT 22.3193° N<br />LON 114.1694° E</div>
          <div className="synapse-corner synapse-corner-right" aria-hidden="true">MOTION / <span>READY</span><br />SYNAPSES / <span>07</span></div>
          <div className="synapse-scroll" aria-hidden="true"><span>SCROLL TO EXPLORE</span><i /></div>
        </section>

        <section id="about" className="synapse-info synapse-info-dark">
          <div className="synapse-info-index">02 / IDENTITY</div>
          <div><h2>不是答案，<br /><em>是连接。</em></h2><p>这里记录一个碳基生物如何观察世界、拆解问题，再把新的想法接回旧的记忆。你看到的每一篇文章，都是一次正在形成的突触。</p></div>
        </section>

        <section id="protocol" className="synapse-info synapse-info-light">
          <div className="synapse-info-index">03 / PROTOCOL</div>
          <div><h2>靠近菜单，<br /><em>让神经元找到你。</em></h2><p>移动鼠标或使用键盘聚焦入口，背景中的神经细胞会向目标建立连接。连接会短暂保留，然后慢慢衰减。</p></div>
        </section>

        <section className="synapse-transmissions" aria-labelledby="transmission-title">
          <div className="synapse-section-head"><div><p>RECENT TRANSMISSIONS</p><h2 id="transmission-title">最新意识切片</h2></div><Link href="/blog">查看全部 <span aria-hidden="true">↗</span></Link></div>
          <div className="synapse-signal-list">
            {transmissions.length > 0 ? transmissions.map((post, index) => (
              <Link href={`/blog/${post.id}`} className="synapse-signal-row" key={post.id}><span className="synapse-signal-index">{String(index + 1).padStart(2, '0')}</span><div><h3>{post.title}</h3>{post.description ? <p>{post.description}</p> : null}</div><time dateTime={post.createdTime || undefined}>{formatDate(post.createdTime)}</time><span aria-hidden="true">↗</span></Link>
            )) : <Link href="/blog" className="synapse-signal-empty">信号仍在同步，进入完整文章档案 <span aria-hidden="true">→</span></Link>}
          </div>
        </section>
      </main>

      <footer className="synapse-footer">
        <span>IZEL / CARBON-BASED ARCHIVE</span><span>END OF CURRENT TRANSMISSION</span>
      </footer>
    </div>
  )
}
