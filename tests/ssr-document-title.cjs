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

function renderHead(node) {
  let head = []
  const value = {
    updateHead(state) {
      head = state || []
    },
    mountedInstances: new Set(),
    updateScripts() {},
    scripts: {},
  }
  renderToString(React.createElement(HeadManagerContext.Provider, { value }, node))
  const html = head.map(element => renderToString(element)).join('')
  return html
}

function titleText(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1] : ''
}

function ogTitle(html) {
  const match =
    html.match(/<meta\b(?=[^>]*\bproperty="og:title")[^>]*\bcontent="([^"]*)"[^>]*>/i) ||
    html.match(/<meta\b(?=[^>]*\bcontent="([^"]*)")[^>]*\bproperty="og:title"[^>]*>/i)
  return match ? match[1] : ''
}

function assertShareTitle(html, expected) {
  const title = titleText(html)
  const og = ogTitle(html)
  assert.notEqual(title, '', 'SSR <title> should not be empty')
  assert.equal(title, expected)
  assert.equal(og, expected)
  assert.equal(html.match(/<title\b/gi).length, 1)
  assert.equal((html.match(/property="og:title"/gi) || []).length, 1)
}

function canonicalHref(html) {
  const links = html.match(/<link\b[^>]*rel="canonical"[^>]*>/gi) || []
  assert.equal(links.length, 1)
  const href = (html.match(/<link\b(?=[^>]*rel="canonical")[^>]*href="([^"]*)"/i) || [])[1] || ''
  return href
}

function BarePage() {
  return React.createElement('main', null, 'bare')
}

const App = require('../pages/_app.js').default
const Home = require('../pages/index.js').default
const Blog = require('../pages/blog.js').default
const BlogDetail = require('../pages/blog/[id].js').default

function renderApp(Page, pageProps) {
  return renderHead(React.createElement(App, { Component: Page, pageProps }))
}

test('pages without ShareMeta inherit the homepage share fallback', () => {
  const html = renderApp(BarePage, {})
  assertShareTitle(html, 'IZEL / SYNAPSE ARCHIVE')
  assert.equal(canonicalHref(html), 'https://izelzzz.com/')
  assert.match(html, /property="og:image"[^>]*content="https:\/\/izelzzz\.com\/og-default\.webp"/)
  assert.match(html, /name="twitter:card"[^>]*content="summary_large_image"/)
})

test('home SSR title matches og:title', () => {
  const html = renderApp(Home, { transmissions: [] })
  assertShareTitle(html, 'IZEL / SYNAPSE ARCHIVE')
  assert.equal(canonicalHref(html), 'https://izelzzz.com/')
})

test('blog index SSR title matches og:title', () => {
  const html = renderApp(Blog, {
    posts: [],
    error: null,
    initialNextCursor: null,
    initialHasMore: false,
  })
  assertShareTitle(html, '碳基生物Izel狂想曲 - 博客')
  assert.equal(canonicalHref(html), 'https://izelzzz.com/blog')
})

test('article SSR title matches og:title and is not dropped', () => {
  const articleTitle = '突触里的一封信'
  const page = {
    id: '3f5e1787-b650-81ee-a210-c39d3901fbb5',
    created_time: '2026-01-02T00:00:00.000Z',
    cover: null,
    properties: {
      标题: { title: [{ plain_text: articleTitle }] },
      Description: { rich_text: [{ plain_text: '一段描述' }] },
      Tag: { multi_select: [] },
    },
  }
  const html = renderApp(BlogDetail, { page, blocks: [], error: null })
  assertShareTitle(html, articleTitle)
  assert.equal(canonicalHref(html), `https://izelzzz.com/blog/${page.id}`)
})
