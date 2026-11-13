const assert = require('node:assert/strict')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const { test } = require('node:test')
const { transformSync } = require('next/dist/build/swc')

const root = path.resolve(__dirname, '..')

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
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  })
  mod._compile(code, filename)
}

const { isImgixHost, optimizeListCoverUrl } = require('../lib/cover')
const { isStableShareImageUrl } = require('../lib/seo')

test('isImgixHost accepts imgix domains and their subdomains', () => {
  for (const host of ['imgix.net', 'demo.imgix.net', 'imgix.com', 'assets.imgix.com']) {
    assert.equal(isImgixHost(host), true, host)
  }
})

test('isImgixHost rejects lookalike hosts', () => {
  for (const host of ['evilimgix.net', 'attacker-imgix.com', 'imgix.net.attacker.com', 'notimgix.com']) {
    assert.equal(isImgixHost(host), false, host)
  }
})

test('share image allows imgix subdomains but not lookalikes', () => {
  assert.equal(isStableShareImageUrl('https://demo.imgix.net/cover.jpg'), true)
  assert.equal(isStableShareImageUrl('https://evilimgix.net/cover.jpg'), false)
})

test('share image still rejects signed Notion and S3 file URLs', () => {
  assert.equal(
    isStableShareImageUrl('https://prod-files-secure.s3.us-west-2.amazonaws.com/a/b/cover.png?X-Amz-Algorithm=AWS4-HMAC-SHA256'),
    false,
  )
  assert.equal(isStableShareImageUrl('https://s3.us-west-2.amazonaws.com/secure.notion-static.com/a/cover.png'), false)
})

test('cover optimizer only rewrites real imgix hosts', () => {
  const resized = new URL(optimizeListCoverUrl('https://demo.imgix.net/cover.jpg', { width: 720, quality: 55 }))
  assert.equal(resized.searchParams.get('w'), '720')
  assert.equal(resized.searchParams.get('auto'), 'format')

  const lookalike = 'https://evilimgix.net/cover.jpg'
  assert.equal(optimizeListCoverUrl(lookalike), lookalike)
})
