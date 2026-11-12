import Link from 'next/link'
import DawnSky from '../components/DawnSky'
import ShareMeta from '../components/ShareMeta'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { queryPublicDatabase } from '../lib/notion'
import { BEYOND, CONTACTS, INTRO, PIPELINE, PRINCIPLES, PROJECTS, STACK } from '../lib/profile'
import { DEFAULT_DESCRIPTION, HOME_TITLE } from '../lib/seo'

function formatDate(isoString) {
  if (!isoString) return ''
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(isoString))
  } catch {
    return ''
  }
}

export async function getStaticProps() {
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!process.env.NOTION_TOKEN || !databaseId) return { props: { transmissions: [] }, revalidate: 3600 }

  try {
    const { results } = await queryPublicDatabase(databaseId, {
      pageSize: 3,
      maxPages: 3,
    })
    const transmissions = results.map(post => ({
      id: post.id,
      title: post.properties['标题']?.title?.[0]?.plain_text || '未命名',
      description: post.properties.Description?.rich_text?.[0]?.plain_text || '',
      createdTime: post.created_time || null,
      tags: (post.properties['Tag']?.multi_select || []).map(tag => tag.name).slice(0, 3),
    }))
    return { props: { transmissions }, revalidate: 3600 }
  } catch (err) {
    console.error('Failed to fetch transmissions:', err)
    return { props: { transmissions: [] }, revalidate: 300 }
  }
}

function SectionHead({ label, title, id, children }) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">{label}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Home({ transmissions }) {
  const posts = Array.isArray(transmissions) ? transmissions : []

  return (
    <div className="site">
      <ShareMeta
        title={HOME_TITLE}
        description={DEFAULT_DESCRIPTION}
        path="/"
        image="/og-default.webp"
        type="website"
      />
      <SiteHeader />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <DawnSky />
          <div className="hero-inner">
            <p className="eyebrow hero-eyebrow">HELLO, I&rsquo;M</p>
            <h1 id="hero-title">Izel</h1>
            <span className="hero-rule" aria-hidden="true" />
            <p className="hero-tagline">
              Build with AI. <span>Think beyond AI.</span>
            </p>
            <p className="hero-sub">带着产品思维的构建者 · AI × 软件 × 人的创造力</p>
            <div className="hero-actions">
              <Link href="/blog" className="button button-primary">读文章</Link>
              <a href="#about" className="button button-ghost">关于我</a>
            </div>
          </div>
        </section>

        <section id="about" className="section" aria-labelledby="about-title">
          <div className="wrap split">
            <SectionHead label="whoami" title="关于我" id="about-title" />
            <div className="prose-lead">
              {INTRO.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section id="principles" className="section section-tint" aria-labelledby="principles-title">
          <div className="wrap">
            <SectionHead label="how_i_work_with_ai" title="我怎么和 AI 一起工作" id="principles-title" />
            <p className="section-intro">
              我交付的代码大部分由 AI 写成。我负责的是它周围的系统，也就是决定这些产出能不能被信任的那一部分。
            </p>
            <ol className="pipeline" aria-label="工作流程">
              {PIPELINE.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <ol className="principles">
              {PRINCIPLES.map((item, index) => (
                <li key={item.title}>
                  <span className="principle-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="projects" className="section" aria-labelledby="projects-title">
          <div className="wrap">
            <SectionHead label="currently_building" title="正在做的东西" id="projects-title" />
            <div className="project-grid">
              {PROJECTS.map(project => (
                <a
                  key={project.name}
                  href={project.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="project-card"
                >
                  <span className="project-kind">{project.kind}</span>
                  <h3>{project.name}</h3>
                  <p>{project.text}</p>
                  <span className="project-link">GitHub <span aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
            <dl className="stack">
              {STACK.map(group => (
                <div key={group.label}>
                  <dt>{group.label}</dt>
                  <dd>{group.items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="writing" className="section section-tint" aria-labelledby="writing-title">
          <div className="wrap">
            <SectionHead label="recent_writing" title="最近写的" id="writing-title">
              <Link href="/blog" className="text-link">全部文章 <span aria-hidden="true">→</span></Link>
            </SectionHead>
            {posts.length > 0 ? (
              <ul className="post-rows">
                {posts.map(post => (
                  <li key={post.id}>
                    <Link href={`/blog/${post.id}`} className="post-row">
                      <time dateTime={post.createdTime || undefined}>{formatDate(post.createdTime)}</time>
                      <div>
                        <h3>{post.title}</h3>
                        {post.description ? <p>{post.description}</p> : null}
                      </div>
                      <span className="post-row-tags">{(post.tags || []).join(' · ')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">
                文章列表暂时没有取到。<Link href="/blog" className="text-link">去文章页看看</Link>
              </p>
            )}
          </div>
        </section>

        <section id="beyond" className="section" aria-labelledby="beyond-title">
          <div className="wrap">
            <SectionHead label="beyond_the_terminal" title="屏幕之外" id="beyond-title" />
            <p className="section-intro">不是所有值得探索的事，都发生在屏幕前。</p>
            <ul className="beyond-grid">
              {BEYOND.map(item => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className="section section-tint" aria-labelledby="contact-title">
          <div className="wrap split">
            <SectionHead label="contact" title="联系我" id="contact-title" />
            <ul className="contact-list">
              {CONTACTS.map(contact => {
                const external = contact.href.startsWith('http')
                return (
                  <li key={contact.label}>
                    <span>{contact.label}</span>
                    <a
                      href={contact.href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noreferrer noopener' : undefined}
                    >
                      {contact.value}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
