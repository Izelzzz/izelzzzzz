import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-primary text-accent">
      <Head>
        <title>碳基生物Izel狂想曲</title>
        <meta name="description" content="像素马赛克风格的个人博客，自动同步Notion文章，支持评论、标签、分类" />
      </Head>
      <header className="sticky top-0 z-30 bg-primary/80 backdrop-blur border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight text-lg hover:opacity-90">
            碳基生物Izel狂想曲
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/blog" className="text-mosaic hover:text-accent transition">
              文章
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              简洁的博客界面，
              <span className="text-mosaic">让内容发光。</span>
            </h1>
            <p className="mt-5 text-mosaic text-lg leading-relaxed">
              文章数据来自 Notion，页面专注排版与阅读体验。你可以随时切换一句小提示，然后直接进入文章列表。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/blog"
                className="px-5 py-3 rounded-xl bg-accent text-primary shadow-sm hover:shadow-md transition"
              >
                进入文章世界
              </Link>
              <button
                type="button"
                onClick={() => setTip(mosaicTips[Math.floor(Math.random() * mosaicTips.length)])}
                className="px-5 py-3 rounded-xl border border-black/10 bg-white/70 hover:bg-white transition text-accent"
              >
                换一句提示
              </button>
            </div>

            {tip && (
              <div className="tile p-4 mt-6">
                <div className="text-sm text-mosaic">提示</div>
                <div className="mt-1 font-medium">{tip}</div>
              </div>
            )}
          </div>

          <div className="tile p-6 md:p-8">
            <div className="text-sm text-mosaic">项目概览</div>
            <div className="mt-3 space-y-4">
              <div>
                <div className="font-semibold">极简视觉</div>
                <div className="text-sm text-mosaic">统一留白、清晰层级、内容优先。</div>
              </div>
              <div>
                <div className="font-semibold">Notion 驱动</div>
                <div className="text-sm text-mosaic">自动同步文章与正文。</div>
              </div>
              <div>
                <div className="font-semibold">可读性优先</div>
                <div className="text-sm text-mosaic">标题、段落、列表都做了排版。</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-10 text-center text-sm text-mosaic border-t border-black/5">
        Powered by Next.js · Tailwind CSS · Notion API
      </footer>
    </div>
  )
}
