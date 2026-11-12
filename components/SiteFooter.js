import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-motto">
          Chasing new at sunrise. <span>Wandering classics through twilight.</span>
        </p>
        <nav className="site-footer-links" aria-label="页脚导航">
          <Link href="/">首页</Link>
          <Link href="/blog">Blog</Link>
          <a href="https://github.com/Izelzzz" target="_blank" rel="noreferrer noopener">GitHub</a>
          <a href="https://x.com/izelzzz" target="_blank" rel="noreferrer noopener">X</a>
        </nav>
      </div>
    </footer>
  )
}
