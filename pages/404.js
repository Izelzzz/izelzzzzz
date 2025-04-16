import Link from 'next/link'

export default function Custom404() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-primary text-accent font-pixel">
      <h1 className="text-6xl mb-4">404</h1>
      <p className="mb-4">你闯入了像素世界的迷宫！页面不存在。</p>
      <Link href="/">
        <span className="px-4 py-2 bg-accent text-primary rounded shadow hover:bg-mosaic hover:text-accent transition cursor-pointer">返回首页</span>
      </Link>
    </div>
  )
}
