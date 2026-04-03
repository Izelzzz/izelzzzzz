import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="min-h-screen bg-primary text-accent flex flex-col items-center justify-center p-6">
      <div className="tile p-6 max-w-xl w-full text-center">
        <h1 className="text-5xl font-semibold mb-2">404</h1>
        <p className="text-mosaic">页面不存在或链接已失效。</p>
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
