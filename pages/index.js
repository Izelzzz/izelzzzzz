import Link from 'next/link'
import ShareMeta from '../components/ShareMeta'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import SunScene from '../components/SunScene'
import { SkyButton } from '../components/ThemeToggle'
import { queryPublicDatabase } from '../lib/notion'
import { BEYOND, CONTACTS, INTRO_CLOSING, INTRO_LEAD, INTRO_ROLES, PROJECTS } from '../lib/profile'
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

/** Renders `backtick` spans as inline code. */
function withInlineCode(text) {
  return String(text)
    .split('`')
    .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))
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
          <SunScene variant="hero" />
          <div className="hero-inner">
            <div className="hero-top">
              <p className="hero-tagline">
                Chasing new at sunrise. <span>Wandering classics through twilight.</span>
              </p>
              <div className="hero-actions">
                <Link href="/blog" className="button button-primary">读 Blog</Link>
                <SkyButton />
              </div>
            </div>
            <div className="hero-name">
              <p className="eyebrow hero-eyebrow">HELLO, I&rsquo;M</p>
              <h1 id="hero-title">Izel</h1>
            </div>
          </div>
        </section>

        <section id="about" className="section" aria-labelledby="about-title">
          <div className="wrap split">
            <SectionHead label="whoami" title="关于我" id="about-title" />
            <div className="manifesto">
              <p className="manifesto-roles">
                <span className="manifesto-lead">{INTRO_LEAD}</span>
                {INTRO_ROLES.map(([doing, role], index) => (
                  <span className="manifesto-line" key={role}>
                    {doing}
                    <em>{role}</em>
                    {index === INTRO_ROLES.length - 1 ? '。' : '，'}
                  </span>
                ))}
              </p>
              <p className="manifesto-closing">{INTRO_CLOSING}</p>
            </div>
          </div>
        </section>

        <section id="projects" className="section section-tint" aria-labelledby="projects-title">
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
                  <p>{withInlineCode(project.text)}</p>
                  <span className="project-link">GitHub <span aria-hidden="true">↗</span></span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="writing" className="section" aria-labelledby="writing-title">
          <div className="wrap">
            <SectionHead label="recent_writing" title="最近写的" id="writing-title">
              <Link href="/blog" className="text-link">全部 Blog <span aria-hidden="true">→</span></Link>
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
                最近的内容暂时没有取到。<Link href="/blog" className="text-link">去 Blog 看看</Link>
              </p>
            )}
          </div>
        </section>

        <section id="beyond" className="section section-tint" aria-labelledby="beyond-title">
          <div className="wrap">
            <SectionHead label="beyond_the_terminal" title="屏幕之外" id="beyond-title" />
            <p className="section-intro">不是所有值得探索的事，都发生在屏幕前。</p>
            <ul className="beyond-grid">
              {BEYOND.map(item => (
                <li key={item.title}>
                  <span className="beyond-index" aria-hidden="true">{String(BEYOND.indexOf(item) + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className="section" aria-labelledby="contact-title">
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
