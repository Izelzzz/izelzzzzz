import Head from 'next/head'
import { useState } from 'react'

const mosaicTips = [
  '欢迎来到碳基生物Izel狂想曲！',
  '点击文章页，探索更多内容~',
  '像素世界，奇遇不断！',
  '每一格都是一段旅程',
  '勇敢探索，发现彩蛋！',
  '你是第' + (Math.floor(Math.random() * 1000) + 1) + '位访客',
  '人生如马赛克，拼出你的精彩',
]

export default function Home() {
  const [tip, setTip] = useState('')
  return (
    <div className="relative min-h-screen bg-primary overflow-hidden">
      <Head>
        <title>碳基生物Izel狂想曲</title>
        <meta name="description" content="像素马赛克风格的个人博客，自动同步Notion文章，支持评论、标签、分类" />
      </Head>
      {/* Mosaic Pixel Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="w-full h-full grid grid-cols-12 grid-rows-7 gap-1 opacity-70">
          {Array.from({ length: 84 }).map((_, i) => (
            <div
              key={i}
              className="tile transition hover:scale-110 hover:bg-accent cursor-pointer pointer-events-auto"
              onClick={() => setTip(mosaicTips[Math.floor(Math.random() * mosaicTips.length)])}
              onMouseEnter={e => e.currentTarget.classList.add('ring-2','ring-accent')}
              onMouseLeave={e => e.currentTarget.classList.remove('ring-2','ring-accent')}
              style={{ minHeight: 36 }}
            >
              {i % 13 === 0 ? '🎲' : ''}
            </div>
          ))}
        </div>
      </div>
      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-pixel text-accent mb-2 drop-shadow">碳基生物Izel狂想曲</h1>
          <p className="text-mosaic font-pixel">逛博客就像玩游戏一样！</p>
        </header>
        <a href="/blog" className="px-6 py-3 bg-accent text-primary font-pixel rounded shadow hover:bg-mosaic hover:text-accent transition mb-8 text-xl">进入文章世界</a>
        {tip && (
          <div className="font-pixel bg-mosaic text-primary px-4 py-2 rounded shadow mb-4 animate-bounce">{tip}</div>
        )}
      </main>
      <footer className="absolute bottom-2 left-0 right-0 text-center text-xs text-mosaic z-20">
        Powered by Next.js · Tailwind CSS · Notion API
      </footer>
    </div>
  )
}
