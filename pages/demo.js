import Head from 'next/head'
import Link from 'next/link'
import SpecimenCanvas from '../components/SpecimenCanvas'

const observations = [
  {
    code: '01 / PRODUCT',
    title: '关于造物',
    text: '产品、系统与人类行为之间，不稳定但迷人的连接。',
  },
  {
    code: '02 / TECHNOLOGY',
    title: '关于机器',
    text: '把技术视作新的器官，也观察它如何反过来塑造我们。',
  },
  {
    code: '03 / LIFE',
    title: '关于存活',
    text: '一些私人切片：城市、情绪、关系，以及无法命名的经验。',
  },
]

export default function Demo() {
  return (
    <div className="specimen-page">
      <Head>
        <title>Izel 生物档案 | 风格实验</title>
        <meta name="description" content="碳基生物 Izel 的未来生物档案风格实验。" />
      </Head>

      <header className="specimen-nav">
        <Link href="/" className="specimen-logo">
          IZEL
          <small>CARBON UNIT</small>
        </Link>
        <nav aria-label="Demo 导航">
          <Link href="/blog">文章</Link>
          <Link href="/">返回观测站</Link>
        </nav>
      </header>

      <main>
        <section className="specimen-hero" aria-labelledby="specimen-title">
          <SpecimenCanvas />
          <div className="specimen-stamp" aria-hidden="true">FIELD SAMPLE / 07</div>
          <div className="specimen-hero-copy">
            <p className="specimen-eyebrow">非标准智慧体观察记录</p>
            <h1 id="specimen-title">
              一只碳基生物的
              <span>意识标本</span>
            </h1>
            <p className="specimen-intro">
              没有答案，只有持续变异的想法。这里收录一个人如何理解产品、技术与生活。
            </p>
            <Link href="/blog" className="specimen-enter">
              打开全部切片 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="specimen-labels" aria-hidden="true">
            <span>STATUS / ALIVE</span>
            <span>TYPE / HOMO SAPIENS (?)</span>
            <span>LAST OBSERVED / NOW</span>
          </div>
        </section>

        <div className="specimen-ticker" aria-hidden="true">
          <div>
            OBSERVE · RECORD · MUTATE · QUESTION · OBSERVE · RECORD · MUTATE · QUESTION ·
          </div>
        </div>

        <section className="specimen-observations" aria-labelledby="observation-title">
          <div className="specimen-section-title">
            <p>INDEX OF SUBJECTS</p>
            <h2 id="observation-title">观测范围</h2>
          </div>
          <div className="specimen-observation-list">
            {observations.map(item => (
              <article key={item.code} className="specimen-observation">
                <p>{item.code}</p>
                <h3>{item.title}</h3>
                <div>{item.text}</div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="specimen-footer">
        <span>EXPERIMENTAL HOMEPAGE / DEMO B</span>
        <Link href="/">返回当前版本 →</Link>
      </footer>
    </div>
  )
}
