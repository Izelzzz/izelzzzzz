import Link from 'next/link'

function Error({ statusCode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-primary text-accent font-pixel">
      <h1 className="text-5xl mb-4">{statusCode ? `错误 ${statusCode}` : '发生未知错误'}</h1>
      <p className="mb-4">像素世界出现了一点小故障，请稍后再试。</p>
      <Link href="/">
        <span className="px-4 py-2 bg-accent text-primary rounded shadow hover:bg-mosaic hover:text-accent transition cursor-pointer">返回首页</span>
      </Link>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
