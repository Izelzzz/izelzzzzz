import Link from 'next/link'
import { useEffect, useState } from 'react'
import ThemeToggle from './ThemeToggle'

const LINKS = [
  { href: '/blog', label: 'Blog', key: 'blog' },
  { href: '/#about', label: '关于', key: 'about' },
  { href: '/#projects', label: '项目', key: 'projects' },
  { href: '/#contact', label: '联系', key: 'contact' },
]

/**
 * Shared top bar. `current` marks the active section for assistive tech.
 *
 * On the homepage (`home`) it is only the four links, centred and laid over the
 * hero picture; it gains a backdrop once the page has scrolled past the top.
 * Other pages keep the name on the left (the way home) and the theme switch.
 */
export default function SiteHeader({ current, home = false }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!home) return undefined
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [home])

  const nav = (
    <nav className="site-nav" aria-label="主要导航">
      {LINKS.map(link => (
        <Link key={link.key} href={link.href} aria-current={current === link.key ? 'page' : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  )

  if (home) {
    return (
      <header className={scrolled ? 'site-header site-header-home is-scrolled' : 'site-header site-header-home'}>
        <div className="site-header-inner">{nav}</div>
      </header>
    )
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="Izel 首页">
          <span>Izel</span>
        </Link>
        {nav}
        <ThemeToggle />
      </div>
    </header>
  )
}
