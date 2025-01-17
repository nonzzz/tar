import Benchmark from 'benchmark'
import { createPack } from './dist/index.mjs'

const suite = new Benchmark.Suite()

const assets = {
  'assets/a.mjs': 'const a = 1;',
  'assets/b.mjs': 'import "./c.css"; import { a } from "./a.mjs"; console.log(a);',
  'assets/c.css': 'body { background: red; }'
}

const encodeAssets = {}

for (const [path, content] of Object.entries(assets)) {
  encodeAssets[path] = new TextEncoder().encode(content)
}

suite.add('Pack', () => {
  const pack = createPack()
  for (const [path, content] of Object.entries(encodeAssets)) {
    pack.add(content, {
      filename: path
    })
  }
  pack.done()
})
  .on('cycle', function(event) {
    console.log(String(event.target))
  })
  .run({ 'async': true })
