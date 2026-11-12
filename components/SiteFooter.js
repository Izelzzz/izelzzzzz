import Link from 'next/link'

/** `centered` matches the homepage, where every section sits on the middle axis. */
export default function SiteFooter({ centered = false }) {
  return (
    <footer className={centered ? 'site-footer site-footer-centered' : 'site-footer'}>
      <div className="site-footer-inner">
        <p className="site-footer-motto">
          Wandering classics through the twilight. <span>Chasing new at the sunrise.</span>
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
