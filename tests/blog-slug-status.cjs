const assert = require('node:assert/strict')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const { describe, test } = require('node:test')
const React = require('react')
const { renderToString } = require('react-dom/server')
const { transformSync } = require('next/dist/build/swc')

const root = path.resolve(__dirname, '..')
const REAL_ID = '3f5e1787-b650-81ee-a210-c39d3901fbb5'

function Link({ children, href, ...rest }) {
  return React.createElement('a', { href, ...rest }, children)
}
function Image(props) {
  return React.createElement('img', { src: props.src, alt: props.alt || '' })
}

const calls = []
let publicPageImpl = async () => {
  const error = new Error('forbidden')
  error.status = 403
  error.code = 'restricted_resource'
  throw error
}
let pageImpl = null
let blockImpl = async () => []

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (typeof request === 'string' && request.endsWith('.css')) return {}
  if (request === 'next/link') return Link
  if (request === 'next/image') return Image
  if (typeof request === 'string' && request.includes('lib/notion')) {
    return {
      getPublicPage(...args) {
        calls.push(args)
        return pageImpl(...args)
      },
      getBlockTree(...args) {
        calls.push(args)
        return blockImpl(...args)
      },
      async getPublicPageData(...args) {
        calls.push(args)
        if (pageImpl) {
          const page = await pageImpl(...args)
          if (!page) return null
          const blocks = await blockImpl(...args)
          return { page, blocks }
        }
        return publicPageImpl(...args)
      },
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
    // Next's page transform drops getStaticProps unless the server compiler keeps it.
    disableNextSsg: true,
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      transform: { react: { runtime: 'automatic' } },
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  })
  mod._compile(code, filename)
}

const { getStaticProps, default: BlogDetail } = require('../pages/blog/[id].js')

function notionError(status, code, message = 'notion failed') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

function resetNotion(impl) {
  calls.length = 0
  blockImpl = async () => []
  pageImpl = async (...args) => {
    const result = await impl(...args)
    if (result && Object.prototype.hasOwnProperty.call(result, 'page')) {
      const blocks = result.blocks
      blockImpl = async () => blocks
      return result.page
    }
    return result
  }
  publicPageImpl = impl
}

function resetReaders({ page, blocks }) {
  calls.length = 0
  pageImpl = page
  blockImpl = blocks
  publicPageImpl = async () => {
    throw new Error('getPublicPageData should not run when page and block readers are split')
  }
}

function assertMissing(result) {
  assert.equal(result.notFound, true)
  assert.equal(result.props, undefined)
  assert.equal(result.revalidate, undefined)
}

describe('blog slug status', { concurrency: false }, () => {
test('unknown slug returns 404 without calling Notion', async () => {
  resetNotion(async () => {
    throw new Error('Notion should not be called')
  })
  const result = await getStaticProps({ params: { id: 'this-slug-does-not-exist-xyz' } })
  assertMissing(result)
  assert.equal(calls.length, 0)
})

test('scanner slug .env returns 404 without calling Notion', async () => {
  resetNotion(async () => {
    throw notionError(403, 'restricted_resource')
  })
  const result = await getStaticProps({ params: { id: '.env' } })
  assertMissing(result)
  assert.equal(calls.length, 0)
})

test('Notion 403 warns with the page id before returning 404', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    warnings.push(args.map(part => (typeof part === 'string' ? part : JSON.stringify(part))).join(' '))
  }
  try {
    resetNotion(async () => {
      const error = notionError(403, 'restricted_resource')
      error.token = 'secret-token'
      error.headers = { authorization: 'Bearer secret-token' }
      throw error
    })
    const result = await getStaticProps({ params: { id: REAL_ID } })
    assertMissing(result)
    assert.equal(warnings.length, 1)
    const line = warnings[0]
    assert.match(line, /\[blog\] notion 403 treated as not found/)
    assert.match(line, new RegExp(REAL_ID))
    assert.match(line, /403/)
    assert.match(line, /restricted_resource/)
    assert.equal(line.includes('secret-token'), false)
    assert.equal(line.includes('authorization'), false)
    assert.equal(line.includes('Bearer'), false)
  } finally {
    console.warn = originalWarn
  }
})

test('Notion 404, 403, and object_not_found return 404', async () => {
  const cases = [
    notionError(404, 'object_not_found'),
    notionError(403, 'restricted_resource'),
    notionError(400, 'validation_error', 'page_id should be a valid uuid'),
    Object.assign(new Error('missing'), { code: 'object_not_found' }),
  ]
  for (const error of cases) {
    resetNotion(async () => {
      throw error
    })
    const result = await getStaticProps({ params: { id: REAL_ID } })
    assertMissing(result)
    assert.equal(calls.length, 1)
  }
})

test('private or foreign page returns 404', async () => {
  resetNotion(async () => null)
  const result = await getStaticProps({ params: { id: REAL_ID } })
  assertMissing(result)
})

test('unknown slug stays a 404 when requested again', async () => {
  resetNotion(async () => {
    throw notionError(403, 'restricted_resource')
  })
  const slug = 'this-slug-does-not-exist-xyz'
  const first = await getStaticProps({ params: { id: slug } })
  const second = await getStaticProps({ params: { id: slug } })
  assertMissing(first)
  assertMissing(second)
  assert.equal(calls.length, 0)
})

test('Notion outage is not turned into a cached 404', async () => {
  const failures = [
    notionError(503, 'service_unavailable'),
    notionError(429, 'rate_limited'),
    notionError(401, 'unauthorized'),
    Object.assign(new Error('socket hang up'), { code: 'notionhq_client_request_timeout' }),
    new TypeError('fetch failed'),
  ]
  for (const error of failures) {
    resetNotion(async () => {
      throw error
    })
    await assert.rejects(() => getStaticProps({ params: { id: REAL_ID } }), error)
  }
})

test('a successful page read followed by a block 404 fails generation', async () => {
  const rawMessage = 'block object_not_found raw body'
  resetReaders({
    page: async () => ({
      id: REAL_ID,
      properties: { 标题: { title: [{ plain_text: '仍在的文章' }] } },
    }),
    blocks: async () => {
      throw notionError(404, 'object_not_found', rawMessage)
    },
  })

  await assert.rejects(() => getStaticProps({ params: { id: REAL_ID } }), (error) => {
    assert.equal(error.status, 404)
    assert.equal(error.code, 'object_not_found')
    assert.equal(error.message, rawMessage)
    return true
  })
  assert.equal(calls.length, 2)
})

test('a real article renders and stays on the one-hour ISR cache', async () => {
  const page = {
    id: REAL_ID,
    created_time: '2026-01-02T00:00:00.000Z',
    cover: null,
    properties: {
      标题: { title: [{ plain_text: '突触里的一封信' }] },
      Description: { rich_text: [] },
      Tag: { multi_select: [] },
    },
  }
  const blocks = []
  resetNotion(async () => ({ page, blocks }))
  const result = await getStaticProps({ params: { id: REAL_ID } })
  assert.equal(result.notFound, undefined)
  assert.equal(result.revalidate, 3600)
  assert.equal(result.props.page, page)
  assert.deepEqual(result.props.blocks, blocks)
  assert.equal('error' in result.props, false)

  const html = renderToString(React.createElement(BlogDetail, result.props))
  assert.match(html, /突触里的一封信/)
  assert.equal(html.includes('文章不存在或获取失败'), false)
})
})
