import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

const LINKS = [
  { href: '/blog', label: '文章', key: 'blog' },
  { href: '/#about', label: '关于', key: 'about' },
  { href: '/#projects', label: '项目', key: 'projects' },
  { href: '/#contact', label: '联系', key: 'contact' },
]

/** Shared top bar. `current` marks the active section for assistive tech. */
export default function SiteHeader({ current }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="Izel 首页">
          <span className="site-brand-sun" aria-hidden="true" />
          <span>Izel</span>
        </Link>
        <nav className="site-nav" aria-label="主要导航">
          {LINKS.map(link => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={current === link.key ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  )
}
