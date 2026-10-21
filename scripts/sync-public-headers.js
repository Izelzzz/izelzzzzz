const fs = require('node:fs')
const path = require('node:path')
const { renderPublicHeadersFile } = require('../lib/security-headers')

const target = path.join(__dirname, '..', 'public', '_headers')
fs.writeFileSync(target, renderPublicHeadersFile())
console.log(`Wrote ${target}`)
