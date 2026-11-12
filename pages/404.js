import Link from 'next/link'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import SunScene from '../components/SunScene'

export default function Custom404() {
  return (
    <div className="site">
      <SiteHeader />
      <main>
        <div className="page-scene page-scene-sunk">
          <SunScene variant="sunk" />
          <div className="wrap page-scene-inner">
            <h1>404</h1>
          </div>
        </div>
        <div className="wrap error-main">
          <h2>这一页已经沉到地平线以下</h2>
          <p className="page-lede">链接可能已经失效，或者地址写错了。</p>
          <div className="hero-actions">
            <Link href="/" className="button button-primary">返回首页</Link>
            <Link href="/blog" className="button button-ghost">去 Blog</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
