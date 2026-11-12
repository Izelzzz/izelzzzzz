import Link from 'next/link'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

function Error({ statusCode }) {
  return (
    <div className="site">
      <SiteHeader />
      <main className="wrap error-main">
        <p className="eyebrow">{statusCode ? `错误 ${statusCode}` : '错误'}</p>
        <h2>页面出了点问题</h2>
        <p className="page-lede">请稍后再试一次。</p>
        <div className="hero-actions">
          <Link href="/" className="button button-primary">返回首页</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
