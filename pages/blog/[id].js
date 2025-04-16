import { notion } from '../../lib/notion'
import Head from 'next/head'
import Link from 'next/link'

// 获取所有 blocks
async function getPageBlocks(pageId) {
  const blocks = []
  let cursor = undefined
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor })
    blocks.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return blocks
}

export async function getServerSideProps(context) {
  const { id } = context.params
  let page = null
  let blocks = []
  try {
    page = await notion.pages.retrieve({ page_id: id })
    blocks = await getPageBlocks(id)
  } catch (e) {
    // 页面不存在或API异常
  }
  return { props: { page, blocks } }
}

function renderBlock(block) {
  const { type, id } = block
  const value = block[type]
  switch (type) {
    case 'paragraph':
      return <p key={id} className="mb-4 text-base text-mosaic">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</p>
    case 'heading_1':
      return <h2 key={id} className="text-2xl font-bold my-4">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</h2>
    case 'heading_2':
      return <h3 key={id} className="text-xl font-bold my-3">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</h3>
    case 'heading_3':
      return <h4 key={id} className="text-lg font-bold my-2">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</h4>
    case 'bulleted_list_item':
      return <li key={id} className="list-disc ml-6">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</li>
    case 'numbered_list_item':
      return <li key={id} className="list-decimal ml-6">{value.rich_text.map((t, i) => <span key={i}>{t.plain_text}</span>)}</li>
    default:
      return null // 其他类型暂不渲染
  }
}

export default function BlogDetail({ page, blocks }) {
  if (!page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-accent font-pixel">
        <h1 className="text-3xl mb-4">文章不存在或获取失败</h1>
        <Link href="/blog">
          <span className="px-4 py-2 bg-accent text-primary rounded shadow hover:bg-mosaic hover:text-accent transition cursor-pointer">返回文章列表</span>
        </Link>
      </div>
    )
  }
  const title = page.properties['标题']?.title[0]?.plain_text || '未命名'
  const tags = page.properties['Tag']?.multi_select.map(t => t.name).join(', ')
  const desc = page.properties.Description?.rich_text[0]?.plain_text || ''
  // 分组渲染列表
  let listType = null, listBuffer = []
  const content = []
  blocks.forEach((block, idx) => {
    if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      if (!listType) listType = block.type
      if (block.type === listType) {
        listBuffer.push(block)
      } else {
        // 渲染上一个列表
        content.push(
          <ul key={idx + '-list'} className="mb-4">
            {listBuffer.map(renderBlock)}
          </ul>
        )
        listBuffer = [block]
        listType = block.type
      }
    } else {
      if (listBuffer.length > 0) {
        content.push(
          <ul key={idx + '-list'} className="mb-4">
            {listBuffer.map(renderBlock)}
          </ul>
        )
        listBuffer = []
        listType = null
      }
      content.push(renderBlock(block))
    }
  })
  if (listBuffer.length > 0) {
    content.push(
      <ul key={'last-list'} className="mb-4">
        {listBuffer.map(renderBlock)}
      </ul>
    )
  }
  return (
    <div className="min-h-screen bg-primary text-accent font-pixel flex flex-col items-center p-8">
      <Head>
        <title>{title} - 碳基生物Izel狂想曲</title>
      </Head>
      <div className="max-w-2xl w-full tile p-8 shadow-lg mt-10">
        <h1 className="text-3xl mb-4">{title}</h1>
        <div className="text-xs text-mosaic mb-2">{tags}</div>
        <div className="mb-6 text-base text-mosaic">{desc}</div>
        <article className="notion-content">
          {content.length > 0 ? content : <div className="text-mosaic">暂无正文内容</div>}
        </article>
      </div>
      <Link href="/blog" className="mt-8">
        <span className="px-4 py-2 bg-accent text-primary rounded shadow hover:bg-mosaic hover:text-accent transition cursor-pointer">返回文章列表</span>
      </Link>
    </div>
  )
}
