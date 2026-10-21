const assert = require('node:assert/strict')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const { test } = require('node:test')
const { transformSync } = require('next/dist/build/swc')

const root = path.resolve(__dirname, '..')
let listImpl = async () => ({ results: [], has_more: false })

const origLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === '@notionhq/client') {
    return {
      Client: class {
        constructor() {
          this.blocks = {
            children: {
              list: (...args) => listImpl(...args),
            },
          }
        }
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
    jsc: {
      parser: { syntax: 'ecmascript', jsx: true },
      target: 'es2022',
    },
    module: { type: 'commonjs' },
  })
  mod._compile(code, filename)
}

process.env.NOTION_TOKEN = 'test-token'
const { getBlockTree } = require('../lib/notion')

function assertContentTooLarge(error) {
  assert.equal(error.code, 'content_too_large')
  return true
}

test('more than 1000 blocks throws content_too_large', async () => {
  listImpl = async () => ({
    results: Array.from({ length: 1001 }, (_, index) => ({
      id: `block-${index}`,
      has_children: false,
    })),
    has_more: false,
  })

  await assert.rejects(() => getBlockTree('3f5e1787-b650-81ee-a210-c39d3901fbb5'), assertContentTooLarge)
})

test('nesting deeper than 8 throws content_too_large', async () => {
  listImpl = async ({ block_id }) => ({
    results: [{ id: `${block_id}-child`, has_children: true }],
    has_more: false,
  })

  await assert.rejects(() => getBlockTree('3f5e1787-b650-81ee-a210-c39d3901fbb5'), assertContentTooLarge)
})
