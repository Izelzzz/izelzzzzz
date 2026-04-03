import Link from 'next/link'

function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-primary text-accent flex flex-col items-center justify-center p-6">
      <div className="tile p-6 max-w-xl w-full text-center">
        <h1 className="text-4xl font-semibold mb-2">
          {statusCode ? `错误 ${statusCode}` : '发生未知错误'}
        </h1>
        <p className="text-mosaic">发生了一点小问题，请稍后再试。</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-xl bg-accent text-primary text-sm hover:opacity-95 transition"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
