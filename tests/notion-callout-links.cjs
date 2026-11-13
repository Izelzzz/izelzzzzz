const assert = require('node:assert/strict')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const test = require('node:test')
const React = require('react')
const { renderToString } = require('react-dom/server')
const { transformSync } = require('next/dist/build/swc')
const { HeadManagerContext } = require('next/dist/shared/lib/head-manager-context.shared-runtime')

const root = path.resolve(__dirname, '..')

function Link({ children, href, ...rest }) {
  return React.createElement('a', { href, ...rest }, children)
}
function Image(props) {
  return React.createElement('img', { src: props.src, alt: props.alt || '' })
}

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (typeof request === 'string' && request.endsWith('.css')) return {}
  if (request === 'next/link') return Link
  if (request === 'next/image') return Image
  if (request === 'next/router') {
    return {
      useRouter: () => ({
        isReady: true,
        query: {},
        pathname: '/blog',
        asPath: '/blog',
        push() {},
        replace() {},
      }),
    }
  }
  return origLoad.call(this, request, parent, isMain)
}

const origJs = Module._extensions['.js']
Module._extensions['.js'] = function (mod, filename) {
  if (!filename.startsWith(root) || filename.includes(`${path.sep}node_modules${path.sep}`)) {
    return origJs(mod, filename)
  }
  const src = fs.readFileSync(filename, 'utf8')
  if (!/(^|\n)\s*(import|export)\s/.test(src)) return origJs(mod, filename)
  const { code } = transformSync(src, {
    filename,
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  })
  mod._compile(code, filename)
}

const BlogDetail = require('../pages/blog/[id].js').default

const URL = 'https://github.com/Izelzzz/izel-skill'
const text = (content, link) => ({
  type: 'text',
  plain_text: content,
  href: link || null,
  text: { content, link: link ? { url: link } : null },
  annotations: {},
})

function renderArticle(blocks) {
  const page = {
    id: 'p1',
    created_time: '2026-01-02T00:00:00.000Z',
    cover: { type: 'external', external: { url: 'https://example.com/c.png' } },
    properties: { 标题: { title: [{ plain_text: 't' }] }, Tag: { multi_select: [] } },
  }
  return renderToString(React.createElement(BlogDetail, { page, blocks }))
}

test('callout renders icon, rich text and children', () => {
  const html = renderArticle([
    {
      id: 'c1',
      type: 'callout',
      has_children: true,
      callout: {
        icon: { type: 'emoji', emoji: '📌' },
        color: 'gray_background',
        rich_text: [text('Before you start a task, '), { ...text('confirm'), annotations: { bold: true } }],
      },
      children: [{ id: 'c1p', type: 'paragraph', paragraph: { rich_text: [text('child line')] } }],
    },
  ])
  assert.match(html, /class="notion-callout notion-bg notion-bg-gray"/)
  assert.match(html, /📌/)
  assert.match(html, /Before you start a task, /)
  assert.match(html, /<strong>confirm<\/strong>/)
  assert.match(html, /child line/)
})

test('inline link in paragraph is not duplicated as a link card', () => {
  const html = renderArticle([
    { id: 'p', type: 'paragraph', paragraph: { rich_text: [text('Skill 地址：'), text(URL, URL)] } },
  ])
  assert.equal((html.match(/href="https:\/\/github\.com\/Izelzzz\/izel-skill"/g) || []).length, 1)
  assert.doesNotMatch(html, /link-card/)
})

for (const type of ['bookmark', 'embed', 'link_preview']) {
  test(`${type} renders as a plain link, not a card`, () => {
    const html = renderArticle([{ id: 'b', type, [type]: { url: URL, caption: [] } }])
    assert.match(html, /<p class="notion-link"><a href="https:\/\/github\.com\/Izelzzz\/izel-skill"[^>]*>https:\/\/github\.com\/Izelzzz\/izel-skill<\/a><\/p>/)
    assert.doesNotMatch(html, /link-card/)
  })
}

test('bookmark repeating an inline link is not shown twice', () => {
  const html = renderArticle([
    { id: 'p', type: 'paragraph', paragraph: { rich_text: [text('Skill 地址：'), text(URL, URL)] } },
    { id: 'b', type: 'bookmark', bookmark: { url: URL, caption: [] } },
  ])
  assert.equal((html.match(/href="https:\/\/github\.com\/Izelzzz\/izel-skill"/g) || []).length, 1)
})
