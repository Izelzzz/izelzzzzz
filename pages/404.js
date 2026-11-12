import Link from 'next/link'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

export default function Custom404() {
  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap error-main">
        <p className="eyebrow">404</p>
        <h1>这一页不存在</h1>
        <p className="page-lede">链接可能已经失效，或者地址写错了。</p>
        <div className="hero-actions">
          <Link href="/" className="button button-primary">返回首页</Link>
          <Link href="/blog" className="button button-ghost">看文章</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
