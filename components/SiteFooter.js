import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-motto">
          Build with AI. <span>Think beyond AI.</span>
        </p>
        <nav className="site-footer-links" aria-label="页脚导航">
          <Link href="/">首页</Link>
          <Link href="/blog">文章</Link>
          <a href="https://github.com/Izelzzz" target="_blank" rel="noreferrer noopener">GitHub</a>
          <a href="https://x.com/izelzzz" target="_blank" rel="noreferrer noopener">X</a>
        </nav>
      </div>
    </footer>
  )
}
